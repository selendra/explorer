import { Table } from 'antd'
import { Link } from 'react-router-dom';
import { shortenAddress, timeDuration } from '../utils';

export default function BlocksTable({ short, loading, data, onChange }) {
  return (
    <Table 
      dataSource={data?.blocks}
      loading={loading}
      className='table-styling'
      pagination={short ? false : {
        pageSize: 10,
        total: data?.total_page,
        onChange:(page) => {
          onChange(page);
        } 
      }}
    >
      <Table.Column 
        title="Block"
        dataIndex="blockNumber"
        key="block"
        render={blockNumber => (
          <Link to={`/blocks/${blockNumber}`}>
            <div className='blocks-height'>
              <p># {Number(blockNumber)}</p>
            </div>  
          </Link>
        )}
      />
      <Table.Column 
        title="Status"
        dataIndex="finalized"
        render={finalized => (
          <p>{+(finalized)}</p>
        )}
      />
      <Table.Column 
        title="Time"
        dataIndex="timestamp" 
        render={timestamp => (
          <p>{timeDuration(timestamp)}</p>
        )}
      />
      <Table.Column 
        title="Extrinsics"
        dataIndex="totalExtrinsics" 
      />
      <Table.Column 
        title="Events"
        dataIndex="totalEvents" 
      />
      <Table.Column 
        title="Validator"
        dataIndex="blockAuthor" 
        render={blockAuthor => (
          <p>{shortenAddress(blockAuthor)}</p>
        )}
      />
      <Table.Column 
        title="BlockHash"
        dataIndex="blockHash"
        render={blockHash => (
          <p>{shortenAddress(blockHash)}</p>
        )}
      />
    </Table>
  )
}
