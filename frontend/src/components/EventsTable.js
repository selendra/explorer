import { Table, Row } from 'antd'
import { CaretRightOutlined } from '@ant-design/icons'
import React, { useState } from 'react'
import { formatNumber, shortenAddress, timeDuration } from '../utils';
import { Link } from 'react-router-dom';

export default function EventsTable({loading, data, onChange}) {
  return (
    <Table
      dataSource={data?.events}
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
        title='Event ID'
        render={(text, record) => (
          <p>#{formatNumber(record.blockNumber)}-{record.eventIndex}</p>
        )}
      />
      <Table.Column 
        title='Block'
        render={(text, record) => (
          <Link to={`/blocks/${record.blockNumber}`}>
            <p>#{formatNumber(record.blockNumber)}</p>
          </Link>
        )}
      />
      <Table.Column 
        title='Time'
        responsive={['md']}
        render={(text, record) => (
          <p>{timeDuration(record.timestamp)}</p>
        )}
      />
      <Table.Column 
        title='Section/Method'
        render={(text, record) => (
          <p>{record.section} <img src='/assets/icons/arrow.svg' alt='' width={14} height={14} /> {record.method}</p>
        )}
      />
    </Table>
  )
}
