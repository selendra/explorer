import { Table } from 'antd'
import { Link } from 'react-router-dom';
import { shortenAddress, timeDuration } from '../utils';

export default function BlocksTable({ short, loading, data, onChange }) {
  return (
    <Table 
      dataSource={data?.data}
      loading={loading}
      className='table-styling'
      pagination={short ? false : {
        pageSize: 10,
        total: data?.total,
        onChange:(page) => {
          onChange(page);
        } 
      }}
    >
      <Table.Column 
        title="Block"
        dataIndex="block"
        key="block"
        defaultSortOrder= 'descend'
        render={block => (
          <Link to={`/blocks/${block.header.number}`}>
            <div className='blocks-height'>
              <p># {Number(block.header.number)}</p>
            </div>  
          </Link>
        )}
      />
      <Table.Column 
        title="Age"
        dataIndex="blockTime" 
        key="blockTime" 
        render={blockTime => (
          <p>{timeDuration(blockTime)}</p>
        )}
      />
      <Table.Column 
        title="Status"
        dataIndex="status" 
        key="status" 
      />
      { !short && 
        <Table.Column 
          title="Hash"
          dataIndex="hash" 
          key="hash" 
          render={hash => (
            <p>{shortenAddress(hash)}</p>
          )}
        />
      }
    </Table>
  )
}
