import { Card, Tabs } from 'antd';
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import ExtrinsicsTable from '../../components/ExtrinsicsTable';
import TableAccountStaking from '../../components/TableAccountStaking';
import TransferTable from '../../components/TransferTable';
import useFetch from '../../hooks/useFetch';

export default function AccountDetail() {
  const { id } = useParams();
  const [page, setPage] = useState(1);

  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/account/${id}`
  );
  const { data: extrinsicData = [] } = useFetch(
    `${process.env.REACT_APP_API}/account/extrinsics/${id}/1`
  );
  const { data: trxData = [] } = useFetch(
    `${process.env.REACT_APP_API}/account/transfer/${id}/1`
  );
  const { data: stakingData = [] } = useFetch(
    `${process.env.REACT_APP_API}/account/staking/${id}/${page}`
  );

  console.log(stakingData)

  return (
    <div className='container'>
      <div className='spacing' />
      <p className='block-title'>Address #{id}</p>
      <Card className='block-detail-card' style={{borderRadius: '8px'}}>
        <table className='table'>
          <tbody>
            <tr>
              <td>Address</td>
              <td>{data?.accountId}</td>
            </tr>
            <tr>
              <td>Balance</td>
              <td>{data?.totalBalance}</td>
            </tr>
            <tr>
              <td>Reserved</td>
              <td>{data?.reservedBalance}</td>
            </tr>
            <tr>
              <td>Locked</td>
              <td>{data?.lockedBalance}</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <div className='spacing'/>
      <Tabs size='large'>
        <Tabs.TabPane tab='Extrinsics' key='extrinsics'>
          <ExtrinsicsTable 
            data={extrinsicData}
            loading={loading}
          /> 
        </Tabs.TabPane>
        <Tabs.TabPane tab='Transfers' key='transfers'>
          <TransferTable 
            data={trxData}
            loading={loading}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab='Staking' key='staking'>
          <TableAccountStaking 
            data={stakingData}
            loading={loading}
            onChange={setPage}
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  )
}
