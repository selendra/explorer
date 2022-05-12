import { Table } from 'antd';
import { Link } from 'react-router-dom';
import { formatNumber, shortenAddress } from '../utils';

export default function AccountsTable({ short, loading, data, onChange }) {
  return (
    <Table
      pagination={short ? false : {
        pageSize: 10,
        total: data?.total_page,
        onChange:(page) => {
          onChange(page)
        }
      }}
      dataSource={data?.accounts}
      rowKey={record => record.accountId}
      loading={loading}
      className='table-styling'
    >
      <Table.Column 
        title='Account'
        dataIndex='accountId'
        render={(accountId) => 
          <Link to={`/accounts/${accountId}`}>{shortenAddress(accountId)}</Link>
        }
      />
      <Table.Column
        title='Free Balance'
        dataIndex='freeBalance'
        render={(freeBalance) => 
          <p>{formatNumber(freeBalance)} SEL</p>
        }
      />
      <Table.Column
        title='Locked Balance'
        responsive={['md']}
        dataIndex='lockedBalance'
        render={(lockedBalance) => 
          <p>{formatNumber(lockedBalance)} SEL</p>
        }
      />
      <Table.Column
        title='Available Balance'
        dataIndex='availableBalance'
        render={(availableBalance) => 
          <p>{formatNumber(availableBalance)} SEL</p>
        }
      />
    </Table>
  )
}
