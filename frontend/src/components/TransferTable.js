import { Table } from 'antd'
import { Link } from 'react-router-dom';
import { shortenAddress, timeDuration } from '../utils';

export default function TransferTable({short, loading, data, onChange}) {
  return (
    <Table
      dataSource={data?.transfers}
      loading={loading}
      className='table-styling'
      pagination={short ? false : {
        pageSize: 10,
        total: data?.total_page,
        onChange:(page) => {
          onChange(page)
        }
      }}
    >
      <Table.Column 
        title="Hash"
        dataIndex="hash" 
        render={hash => (
          <Link to={`/transfers/${hash}`}>
            <div className='blocks-height'>
              <p>{shortenAddress(hash)}</p>
            </div>
          </Link>
        )}
      />
      <Table.Column
        title="Block"
        dataIndex="blockNumber"
        render={blockNumber => (
          <Link to={`/blocks/${blockNumber}`}>
            <div className='blocks-height'>
              <p>#{(blockNumber)}</p>
            </div>
          </Link>
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
        title="From"
        dataIndex="source"
        render={source => (
          <p>{shortenAddress(source)}</p>
        )}
      />
      <Table.Column
        title="To"
        dataIndex="destination"
        render={destination => (
          <p>{shortenAddress(destination)}</p>
        )}
      />
      <Table.Column
        title="Amount"
        dataIndex="amount"
        render={amount => (
          <p>{amount} SEL</p>
        )}
      />
    </Table>
  )
}
