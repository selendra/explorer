import { Table } from 'antd'
import React, { useState } from 'react'
import useFetch from '../hooks/useFetch';
import { FormatBalance, shortenAddress, timeDuration } from '../utils';

export default function TransferTable({short}) {
  const [page, setPage] = useState(0);
  const { loading, error, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/transfers?page=${page}`
  )
  // console.log(data);

  return (
    <Table
      dataSource={data?.data}
      loading={loading}
      className='table-styling'
      pagination={short ? false : {
        pageSize: 10,
        total: data?.total,
        onChange:(page) => {
          setPage(page)
        }
      }}
    >
      <Table.Column 
        title="Transfer"
        dataIndex="indexer" 
        key="indexer" 
        render={indexer => (
          <div className='blocks-height'>
            <p>{shortenAddress(indexer?.blockHash)}</p>
          </div>
        )}
      />
      <Table.Column
        title="Extrinsic"
        dataIndex="extrinsicHash"
        key="extrinsicHash"
        render={extrinsicHash => (
          <div className='blocks-height'>
            <p>{shortenAddress(extrinsicHash)}</p>
          </div>
        )}
      />
      <Table.Column
        title="From"
        dataIndex="from"
        key="from"
        render={from => (
          <p>{shortenAddress(from)}</p>
        )}
      />
      <Table.Column
        title="To"
        dataIndex="to"
        key="to"
        render={to => (
          <p>{shortenAddress(to.id)}</p>
        )}
      />
      <Table.Column
        title="Amount"
        dataIndex="value"
        key="value"
        render={value => (
          <p>{FormatBalance(value)}</p>
        )}
      />
      <Table.Column
        title="Age"
        dataIndex="indexer"
        key="value"
        render={indexer => (
          <p>{timeDuration(indexer.blockTime)}</p>
        )}
      />
    </Table>
  )
}
