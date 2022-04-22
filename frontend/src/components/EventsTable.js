import { Table, Row } from 'antd'
import { CaretRightOutlined } from '@ant-design/icons'
import React, { useState } from 'react'
import useFetch from '../hooks/useFetch';
import { shortenAddress, timeDuration } from '../utils';

export default function EventsTable() {
  const [page, setPage] = useState(0);
  const { loading, error, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/events?page=${page}`
  )

  return (
    <Table
      dataSource={data?.data}
      loading={loading}
      className='table-styling'
      pagination={{
        pageSize: 10,
        total: data?.total,
        onChange:(page) => {
          setPage(page)
        }
      }}
    >
      <Table.Column 
        title='Event ID'
        dataIndex='indexer'
        key=''
        render={indexer => (
          <div className='blocks-height'>
            <p># {indexer.blockHeight}</p>
          </div>
        )}
      />
      <Table.Column 
        title='Extrinsic Hash'
        dataIndex='extrinsicHash'
        key=''
        render={extrinsicHash => (
          <p>{shortenAddress(extrinsicHash)}</p>
        )}
      />
      <Table.Column 
        title='Age'
        dataIndex='indexer'
        key=''
        render={indexer => (
          <p>{timeDuration(indexer.blockTime)}</p>
        )}
      />
      <Table.Column 
        title='Section/Method'
        render={data => (
          <Row align='middle'>
            <p>{data.section}</p>
            <CaretRightOutlined />
            <p>{data.method}</p>
          </Row>
        )}
      />
      {/* <Table.Column 
        title='Data'
        dataIndex='data'
        key=''
        render={data =>(
          <p>{JSON.stringify(data)}</p>
        )}
      /> */}
    </Table>
  )
}
