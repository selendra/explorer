import { Table, Row } from 'antd'
import { CaretRightOutlined } from '@ant-design/icons'
import React, { useState } from 'react'
import { formatNumber, shortenAddress, timeDuration } from '../utils';

export default function LogsTable({loading, data, onChange}) {
  return (
    <Table
      dataSource={data?.logs}
      loading={loading}
      className='table-styling'
      pagination={{
        pageSize: 10,
        total: data?.total_page,
        onChange:(page) => {
          onChange(page)
        }
      }}
    >
      <Table.Column 
        title='Log Index'
        render={(text, record) => (
          <p>#{formatNumber(record.blockNumber)}-{record.index}</p>
        )}
      />
      <Table.Column 
        title='Block'
        render={(text, record) => (
          <p>#{formatNumber(record.blockNumber)}</p>
        )}
      />
      <Table.Column 
        title='Type'
        render={(text, record) => (
          <p>{record.type}</p>
        )}
      />
      <Table.Column 
        title='Engine'
        render={(text, record) => (
          <p>{record.engine}</p>
        )}
      />
    </Table>
  )
}
