import { Table } from 'antd';
import { Link } from 'react-router-dom';
import { formatNumber, shortenAddress, timeDuration } from '../utils';

export default function ExtrinsicsTable({short, loading, data, onChange}) {
  return (
    <Table
      dataSource={data?.extrinsics}
      rowKey={record => record.hash}
      loading={loading}
      className='table-styling'
      // sortDirections='descend'
      pagination={short ? false : {
        pageSize: 10,
        total: data?.total_page,
        onChange: onChange
      }}
    >
      <Table.Column
        title='Hash'
        dataIndex='hash'
        render={hash => (
          <Link to={`/extrinsics/${hash}`}>
            <div className='blocks-height'>
              <p>{shortenAddress(hash)}</p>
            </div>
          </Link>
        )}
      />
      { !short &&
        <Table.Column
          title='Block'
          responsive={['md']}
          dataIndex='blockNumber'
          render={blockNumber => (
            <Link to={`/blocks/${blockNumber}`}>
              <div className='blocks-height'>
                <p>#{formatNumber(blockNumber)}</p>
              </div>
            </Link>
          )}
        />
      }
      <Table.Column
        title='Extrinsic ID'
        render={(text, record) => (
          <p>#{formatNumber(record.blockNumber)}-{record.extrinsicIndex}</p>
        )}
      />
      <Table.Column
        title='Section/Method'
        render={(text, render) => (
          <span>{render.section} <img src='/assets/icons/arrow.svg' alt='' width={14} height={14} /> {render.method}</span>
        )}
      />
      { !short &&
        <>
          <Table.Column
            title='Time'
            responsive={['md']}
            dataIndex='timestamp'
            render={timestamp => (
              <p>{timeDuration(timestamp)}</p>
            )}
          />
          <Table.Column
            title='Signed'
            responsive={['md']}
            dataIndex='isSigned'
            render={isSigned => (
              <p>
                { isSigned ?
                  <img src='/assets/icons/check.svg' alt='' width={18} height={18} />
                  :
                  <img src='/assets/icons/x-circle.svg' alt='' width={18} height={18} />
                }
              </p>
            )}
          />
        </>
      }
    </Table>
  )
}
