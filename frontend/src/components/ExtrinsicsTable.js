import { Table, Row } from 'antd'
import { CaretRightOutlined } from '@ant-design/icons'
import useFetch from '../hooks/useFetch'
import { shortenAddress, timeDuration } from '../utils'
import { useState } from 'react';

export default function ExtrinsicsTable({short, loading, data, onChange}) {
  return (
    <Table
      dataSource={data?.data}
      loading={loading}
      className='table-styling'
      pagination={short ? false : {
        pageSize: 10,
        total: data?.total,
        onChange: onChange
      }}
    >
      <Table.Column
        title='ID'
        dataIndex='indexer'
        key='indexer'
        render={indexer => (
          <div className='blocks-height'>
            <p># {indexer?.blockHeight}</p>
          </div>
        )}
      />
      <Table.Column
        title='Hash'
        dataIndex='hash'
        key='hash'
        render={hash => (
          <p>{shortenAddress(hash)}</p>
        )}
      />
      <Table.Column
        title='Section/Method'
        dataIndex='call'
        key='call'
        render={call => (
          <Row gutter={[8,8]} align='middle'>
            <p>{call.section}</p>
            <CaretRightOutlined />
            <p>{call.method}</p>
          </Row>
        )}
      />
      { !short &&
        <>
          <Table.Column
            title='Age'
            dataIndex='indexer'
            key=''
            render={indexer => (
              <p>{timeDuration(indexer.blockTime)}</p>
            )}
          />
          <Table.Column
            title='Signed'
            dataIndex='isSigned'
            key=''
            render={isSigned => (
              <p>{(isSigned).toString()}</p>
            )}
          />
        </>
      }
    </Table>
  )
}
