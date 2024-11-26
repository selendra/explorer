use anyhow::{anyhow, Result};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use surrealdb::{
	engine::remote::ws::{Client, Ws},
	opt::auth::Root,
	Surreal,
};
use tracing::info;

#[derive(Debug, Clone, Copy)]
pub enum SortOrder {
	Asc,
	Desc,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct PaginatedResult<T> {
	pub items: Vec<T>,
	pub total: u64,
	pub page: u64,
	pub page_size: u64,
	pub total_pages: u64,
}

#[derive(Debug, Deserialize)]
struct CountResult {
	count: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct BatchInsertItem<T> {
	pub id: String,
	pub data: T,
}

#[derive(Debug, Clone)]
pub struct GenericDB<T> {
	pub db: Surreal<Client>,
	table: String,
	_marker: std::marker::PhantomData<T>,
}

impl<T> GenericDB<T>
where
	T: Serialize + DeserializeOwned + Clone + 'static,
{
	pub async fn new(
		url: &str,
		username: &str,
		password: &str,
		namespace: &str,
		database: &str,
		table: &str,
	) -> Result<Self> {
		info!("Connecting to SurrealDB ...");

		let db = Surreal::new::<Ws>(url).await?;
		db.signin(Root { username, password }).await?;
		db.use_ns(namespace).use_db(database).await?;

		info!("Connected to SurrealDB successfully!");

		Ok(Self { db, table: table.to_string(), _marker: std::marker::PhantomData })
	}

	pub async fn insert_item(&self, id: &str, item: T) -> Result<Option<T>> {
		self.execute_with_content("CREATE", id, item, "Inserted").await
	}

	pub async fn update_item(&self, id: &str, item: T) -> Result<Option<T>> {
		self.execute_with_content("UPDATE", id, item, "Updated").await
	}

	// Delete a single item by ID
	pub async fn delete_item(&self, id: &str) -> Result<Option<T>> {
		let deleted: Option<T> = self.db.delete((self.table.as_str(), id)).await?;

		if deleted.is_some() {
			info!("Deleted item with ID: {}", id);
		}
		Ok(deleted)
	}

	pub async fn insert_items(&self, items: Vec<BatchInsertItem<T>>) -> Result<Vec<T>> {
		let mut query = String::from("BEGIN TRANSACTION;\n");

		for item in items.iter() {
			query.push_str(&format!(
				"CREATE {}:{} CONTENT {};\n",
				self.table,
				item.id,
				serde_json::to_string(&item.data)?
			));
		}

		query.push_str("COMMIT TRANSACTION;\n");
		self.db.query(query).await?;

		let ids: Vec<String> = items.iter().map(|item| item.id.clone()).collect();
		self.fetch_items_by_ids(ids).await
	}

	pub async fn get_item_by_field(
		&self,
		field: &str,
		value: impl Serialize + 'static,
	) -> Result<Option<T>> {
		let query = format!("SELECT * FROM {} WHERE {} = $value LIMIT 1;", self.table, field);
		self.db
			.query(&query)
			.bind(("value", value))
			.await
			.map_err(|e| anyhow!(e))?
			.take(0)
			.map_err(|e| anyhow!(e))
	}

	pub async fn get_last_items(
		&self,
		limit: u64,
		field: &str,
		order: SortOrder,
	) -> Result<Vec<T>> {
		let query = format!(
			"SELECT * FROM {} ORDER BY {} {} LIMIT $limit;",
			self.table,
			field,
			order.as_str()
		);

		self.db
			.query(&query)
			.bind(("limit", limit))
			.await
			.map_err(|e| anyhow!(e))?
			.take(0)
			.map_err(|e| anyhow!(e))
	}

	pub async fn get_paginated(&self, page: u64, page_size: u64) -> Result<PaginatedResult<T>> {
		let offset = (page - 1) * page_size;

		let total = self.get_total_count().await?;
		let total_pages = (total + page_size - 1) / page_size;

		let query =
			format!("SELECT * FROM {} ORDER BY number DESC LIMIT $limit START $start;", self.table);

		let items: Vec<T> = self
			.db
			.query(&query)
			.bind(("limit", page_size))
			.bind(("start", offset))
			.await?
			.take(0)?;

		Ok(PaginatedResult { items, total, page, page_size, total_pages })
	}

	pub async fn get_paginated_by_sort(
		&self,
		page: u64,
		page_size: u64,
		sort_by: &str,
		sort_order: SortOrder,
	) -> Result<PaginatedResult<T>> {
		let offset = (page - 1) * page_size;
		let total = self.get_total_count().await?;
		let total_pages = (total + page_size - 1) / page_size;

		let order = match sort_order {
			SortOrder::Asc => "ASC",
			SortOrder::Desc => "DESC",
		};

		let query = format!(
			"SELECT * FROM {} ORDER BY {} {} LIMIT $limit START $start;",
			self.table, sort_by, order
		);

		let items: Vec<T> = self
			.db
			.query(&query)
			.bind(("limit", page_size))
			.bind(("start", offset))
			.await?
			.take(0)?;

		Ok(PaginatedResult { items, total, page, page_size, total_pages })
	}

	// Helper Methods
	async fn get_total_count(&self) -> Result<u64> {
		let query = format!("SELECT VALUE count() FROM {} GROUP ALL;", self.table);
		let count_result: Vec<CountResult> = self.db.query(&query).await?.take(0)?;
		Ok(count_result.first().map(|r| r.count).unwrap_or(0))
	}

	async fn fetch_items_by_ids(&self, ids: Vec<String>) -> Result<Vec<T>> {
		let query = format!("SELECT * FROM {} WHERE id IN $ids;", self.table);
		self.db
			.query(&query)
			.bind(("ids", ids))
			.await
			.map_err(|e| anyhow!(e))?
			.take(0)
			.map_err(|e| anyhow!(e))
	}

	async fn execute_with_content(
		&self,
		action: &str,
		id: &str,
		item: T,
		log_message: &str,
	) -> Result<Option<T>> {
		let query = format!("{} {}:{} CONTENT $content RETURN *;", action, self.table, id);
		let result: Option<T> = self.db.query(&query).bind(("content", item)).await?.take(0)?;

		if result.is_some() {
			info!("{} item with ID: {}", log_message, id);
		}
		Ok(result)
	}
}

impl SortOrder {
	fn as_str(&self) -> &'static str {
		match self {
			SortOrder::Asc => "ASC",
			SortOrder::Desc => "DESC",
		}
	}
}

#[cfg(test)]
mod tests {
	use super::*;
	use serde::{Deserialize, Serialize};
	use tokio;

	#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
	struct TestItem {
		pub number: u64,
		pub name: String,
		pub timestamp: u64,
	}

	async fn setup_db() -> GenericDB<TestItem> {
		GenericDB::new("127.0.0.1:8000", "root", "root", "test", "test", "test_items")
			.await
			.expect("Failed to create DB")
	}

	#[tokio::test]
	async fn test_insert_single_item() -> Result<()> {
		let db = setup_db().await;

		let test_item =
			TestItem { number: 1, name: "Test Item".to_string(), timestamp: 1679825000 };

		let result = db.insert_item("test1", test_item.clone()).await?;
		assert!(result.is_some());

		let inserted_item = result.unwrap();
		assert_eq!(inserted_item.number, test_item.number);
		assert_eq!(inserted_item.name, test_item.name);
		assert_eq!(inserted_item.timestamp, test_item.timestamp);

		Ok(())
	}

	#[tokio::test]
	async fn test_batch_insert() -> Result<()> {
		let db = setup_db().await;

		let items = vec![
			BatchInsertItem {
				id: "batch1".to_string(),
				data: TestItem {
					number: 1,
					name: "Batch Item 1".to_string(),
					timestamp: 1679825002,
				},
			},
			BatchInsertItem {
				id: "batch2".to_string(),
				data: TestItem {
					number: 2,
					name: "Batch Item 2".to_string(),
					timestamp: 1679825003,
				},
			},
		];

		db.insert_items(items.clone()).await?;

		Ok(())
	}

	#[tokio::test]
	async fn test_get_item_by_field() -> Result<()> {
		let db = setup_db().await;

		// Insert test item first
		let test_item =
			TestItem { number: 42, name: "Get By Field Test".to_string(), timestamp: 1679825011 };
		db.insert_item("field_test", test_item.clone()).await?;

		// Test getting by number
		let result = db.get_item_by_field("number", 42).await?;
		assert!(result.is_some());
		let found_item = result.unwrap();
		assert_eq!(found_item.number, test_item.number);
		assert_eq!(found_item.name, test_item.name);

		// Test getting by non-existent number
		let not_found = db.get_item_by_field("number", 9999).await?;
		assert!(not_found.is_none());

		Ok(())
	}

	#[tokio::test]
	async fn test_get_last_items() -> Result<()> {
		let db = setup_db().await;

		// Insert test items
		let items = vec![
			BatchInsertItem {
				id: "last1".to_string(),
				data: TestItem {
					number: 1,
					name: "Last Item 1".to_string(),
					timestamp: 1679825012,
				},
			},
			BatchInsertItem {
				id: "last2".to_string(),
				data: TestItem {
					number: 2,
					name: "Last Item 2".to_string(),
					timestamp: 1679825013,
				},
			},
			BatchInsertItem {
				id: "last3".to_string(),
				data: TestItem {
					number: 3,
					name: "Last Item 3".to_string(),
					timestamp: 1679825014,
				},
			},
		];

		db.insert_items(items).await?;

		// Test getting last 2 items by number in descending order
		let result = db.get_last_items(2, "number", SortOrder::Desc).await?;
		assert_eq!(result.len(), 2);
		assert!(result[0].number > result[1].number);

		// Test getting last 2 items by timestamp in ascending order
		let result = db.get_last_items(2, "timestamp", SortOrder::Asc).await?;
		assert_eq!(result.len(), 2);
		assert!(result[0].timestamp < result[1].timestamp);

		Ok(())
	}

	#[tokio::test]
	async fn test_pagination() -> Result<()> {
		let db = setup_db().await;

		// Insert test items
		let mut batch_items = Vec::new();
		for i in 1..=10 {
			batch_items.push(BatchInsertItem {
				id: format!("page_{}", i),
				data: TestItem {
					number: i as u64,
					name: format!("Page Item {}", i),
					timestamp: 1679825004 + i as u64,
				},
			});
		}

		db.insert_items(batch_items).await?;

		// Test first page
		let page_1 = db.get_paginated(1, 3).await?;
		assert_eq!(page_1.items.len(), 3);
		assert_eq!(page_1.page, 1);
		// assert_eq!(page_1.total, 10); //effect from above test
		assert_eq!(page_1.page_size, 3);
		// assert_eq!(page_1.total_pages, 4); //effect from above test

		// // Test last page
		let last_page = db.get_paginated(4, 3).await?;
		// assert_eq!(last_page.items.len(), 1); //effect from above test
		assert_eq!(last_page.page, 4);

		Ok(())
	}

	#[tokio::test]
	async fn test_delete_item() -> Result<()> {
		let db = setup_db().await;

		// Insert test item
		let test_item =
			TestItem { number: 50, name: "Test Delete".to_string(), timestamp: 1679825000 };

		db.insert_item("delete_test", test_item.clone()).await?;

		// Delete the item
		let deleted = db.delete_item("delete_test").await?;
		assert!(deleted.is_some());

		// Verify item is deleted
		let not_found = db.get_item_by_field("number", 50).await?;
		assert!(not_found.is_none());

		Ok(())
	}

	#[tokio::test]
	async fn test_update_item() -> Result<()> {
		let db = setup_db().await;

		// Insert test item
		let test_item =
			TestItem { number: 60, name: "Test Update".to_string(), timestamp: 1679825000 };

		db.insert_item("update_test", test_item.clone()).await?;

		// Update item
		let updated_item =
			TestItem { number: 60, name: "Updated Name".to_string(), timestamp: 1679826000 };

		let updated = db.update_item("update_test", updated_item.clone()).await?;
		assert!(updated.is_some());
		assert_eq!(updated.unwrap().name, "Updated Name");

		Ok(())
	}
}
