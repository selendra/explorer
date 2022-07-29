import { Avatar, Card, Tabs } from 'antd';
import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import ExtrinsicsTable from '../../components/ExtrinsicsTable';
import Loading from '../../components/Loading';
import TableAccountStaking from '../../components/TableAccountStaking';
import TransferTable from '../../components/TransferTable';
import useFetch from '../../hooks/useFetch';
import { formatNumber } from '../../utils';

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

  if(loading) return (
    <div className="container">
      <Loading />
    </div>
  )

  return (
    <div className='container'>
      <div className='spacing' />
      <p className='block-title'>Address #{id}</p>
      <Card className='block-detail-card' style={{borderRadius: '8px'}}>
        <table className='table'>
          <tbody>
            { data?.identityDetail.identityDisplay &&
              <tr>
                <td>Identity Display</td>
                <td>
                  <Avatar style={{marginRight: '4px', backgroundColor: '#87d068'}} size="small" src={`https://avatars.dicebear.com/api/pixel-art/${data?.accountId}.svg`} />
                  {data?.identityDetail.identityDisplay}
                </td>
              </tr>
            }
            <tr>
              <td>Address</td>
              <td>
                <Avatar style={{marginRight: '4px', backgroundColor: '#87d068'}} size="small" src={`https://avatars.dicebear.com/api/pixel-art/${data?.accountId}.svg`} />
                {data?.accountId}
              </td>
            </tr>
            <tr>
              <td>Total Balance</td>
              <td>{formatNumber(data?.totalBalance)} SEL</td>
            </tr>
            <tr>
              <td>Available Balance</td>
              <td>{formatNumber(data?.availableBalance)} SEL</td>
            </tr>
            <tr>
              <td>Locked Balance</td>
              <td>{formatNumber(data?.lockedBalance)} SEL</td>
            </tr>
            <tr>
              <td>Reserved Balance</td>
              <td>{formatNumber(data?.reservedBalance)} SEL</td>
            </tr>
            <tr>
              <td>Vest Details</td>
              <tr>
                <td>Vest Balance</td>
                <td>{formatNumber(data?.vestingDetails.vestBalance)} SEL</td>
              </tr>
              <tr>
                <td style={{paddingRight: '80px'}}>Vested Claimable</td>
                <td>{formatNumber(data?.vestingDetails.vestedClaimable)} SEL</td>
              </tr>
              <tr>
                <td>Vesting Total</td>
                <td>{formatNumber(data?.vestingDetails.vestingTotal)} SEL</td>
              </tr>
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
