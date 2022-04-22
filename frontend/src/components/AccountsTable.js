import { Table } from 'antd';

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
      loading={loading}
      className='table-styling'
    >
      <Table.Column 
        title='Account'
        dataIndex='accountId'
      />
      <Table.Column
        title='Free Balance'
        dataIndex='freeBalance'
      />
      <Table.Column
        title='Locked Balance'
        dataIndex='lockedBalance'
      />
      <Table.Column
        title='Available Balance'
        dataIndex='availableBalance'
      />
    </Table>
  )
}