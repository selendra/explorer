import { Table } from 'antd';
import React from 'react'
import { timeDuration } from '../utils';

export default function TableAccountStaking({loading, data, short, onChange }) {
  return (
    <Table 
      dataSource={data?.staking_list}
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
        render={blockNumber => (
          <div className='blocks-height'>
            <p># {Number(blockNumber)}</p>
          </div>  
        )}
      />
      <Table.Column 
        title="Time"
        dataIndex="timestamp"
        render={timestamp => (
          <p>{timeDuration(timestamp)}</p>
        )}
      />
      <Table.Column 
        title="Amount"
        dataIndex="amount"
        render={amount => (
          <p>{Number(amount)} SEL</p>
        )}
      />
      <Table.Column 
        title="Era"
        dataIndex="era"
      />
      <Table.Column 
        title="Action"
        dataIndex="action"
      />
    </Table>
  )
}
