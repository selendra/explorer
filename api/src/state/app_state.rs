use selendra_db::setup_db::SurrealDb;

pub struct AppState {
	pub surreal_db: SurrealDb,
}

impl AppState {
	pub fn new(surreal_db: SurrealDb) -> Self {
		AppState { surreal_db }
	}
}
