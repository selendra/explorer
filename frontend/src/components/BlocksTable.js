import { Spin, Table } from 'antd'
import { Link } from 'react-router-dom';
import { shortenAddress, timeDuration } from '../utils';

export default function BlocksTable({ short, loading, data, onChange }) {
  return (
    <Table 
      dataSource={data?.blocks}
      // loading={loading}
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
          dataIndex="timestamp" 
          render={timestamp => (
            <p>{timeDuration(timestamp)}</p>
          )}
        />
      }
      <Table.Column 
        title="Extrinsics"
        dataIndex="totalExtrinsics" 
      />
      <Table.Column 
        title="Events"
        dataIndex="totalEvents" 
      />
      {!short &&
        <Table.Column 
          title="Validator"
          dataIndex="blockAuthor" 
          render={blockAuthor => (
            <p>{shortenAddress(blockAuthor)}</p>
          )}
        />
      }
    </Table>
  )
}
