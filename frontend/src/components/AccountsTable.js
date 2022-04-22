import { Table } from 'antd'
import { useState } from 'react'
import useFetch from '../hooks/useFetch';

export default function AccountsTable({short}) {
  const [page, setPage] = useState(0);
  const { loading, error, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/accounts?page=${page}`
  )

  return (
    <Table
      pagination={short ? false : {
        pageSize: 10,
        total: data?.total,
        onChange:(page) => {
          setPage(page)
        }
      }}
      dataSource={data?.data}
      loading={loading}
      className='table-styling'
    >
      <Table.Column 
        title='Account'
        dataIndex='address'
        key='address'
      />
      <Table.Column
        title='Free Balance'
        dataIndex=''
        key=''
      />
      <Table.Column
        title='Locked Balance'
        dataIndex=''
        key=''
      />
      <Table.Column
        title='Available Balance'
        dataIndex=''
        key=''
      />
    </Table>
  )
}
