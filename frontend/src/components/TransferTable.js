import { Table } from 'antd'
import { Link } from 'react-router-dom';
import { formatNumber, shortenAddress, timeDuration } from '../utils';

export default function TransferTable({short, loading, data, onChange}) {
  return (
    <Table
      dataSource={data?.transfers}
      rowKey={record => record.blockNumber}
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
      { !short &&
        <Table.Column
          title="Block"
          responsive={['md']}
          dataIndex="blockNumber"
          render={blockNumber => (
            <Link to={`/blocks/${blockNumber}`}>
              <div className='blocks-height'>
                <p>#{formatNumber(blockNumber)}</p>
              </div>
            </Link>
          )}
        />
      }
      { !short &&
        <Table.Column
          title="Time"
          responsive={['md']}
          dataIndex="timestamp"
          render={timestamp => (
            <p>{timeDuration(timestamp)}</p>
          )}
        />  
      }
      <Table.Column
        title="From"
        responsive={['md']}
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
          <p>{formatNumber(amount)} SEL</p>
        )}
      />
    </Table>
  )
}
