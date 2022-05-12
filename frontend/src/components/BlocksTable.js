import { Spin, Table } from 'antd'
import { Link } from 'react-router-dom';
import { formatNumber, shortenAddress, timeDuration } from '../utils';

export default function BlocksTable({ short, loading, data, onChange }) {
  return (
    <Table 
      dataSource={data?.blocks}
      loading={loading}
      rowKey={record => record.blockNumber}
      className='table-styling'
      sortDirections='descend'
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
        render={blockNumber => (
          <Link to={`/blocks/${blockNumber}`}>
            <div className='blocks-height'>
              <p># {formatNumber(blockNumber)}</p>
            </div>  
          </Link>
        )}
      />
      <Table.Column 
        title="Status"
        dataIndex="finalized"
        render={finalized => (
          <div>
            {finalized ? 
              <div>
                <img 
                  src='/assets/icons/check.svg' 
                  alt='finalized'
                  width={18} 
                  height={18}
                /> 
                <span style={{marginLeft: '4px'}}>Finalized</span>
              </div>
              :
              <Spin size='small'/> 
            }
          </div>
        )}
      />
      <Table.Column 
        title="Hash"
        dataIndex="blockHash" 
        render={blockHash => (
          <p>{shortenAddress(blockHash)}</p>
        )}
      />
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
        title="Extrinsics"
        responsive={['md']}
        dataIndex="totalExtrinsics" 
      />
      <Table.Column 
        title="Events"
        responsive={['md']}
        dataIndex="totalEvents" 
      />
      {!short &&
        <Table.Column 
          title="Validator"
          responsive={['md']}
          dataIndex="blockAuthor" 
          render={blockAuthor => (
            <p>{shortenAddress(blockAuthor)}</p>
          )}
        />
      }
    </Table>
  )
}
