import { Avatar, Card, Row, Table, Tabs } from 'antd'
import React from 'react'
import { Link, useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import Loading from '../../components/Loading';
import { FormatBalance, formatNumber, shortenAddress, timeDuration } from '../../utils';

export default function ValidatorDetail() {
  let stakeHistory;
  let eraPointsHistory;
  const {id} = useParams();

  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/staking/validators/${id}`
  );

  if(data && !loading) {
    stakeHistory = JSON.parse(data?.stakeHistory);
    eraPointsHistory = JSON.parse(data?.eraPointsHistory);
  }

  if(loading) return (
    <div className="container">
      <Loading />
    </div>
  )

  return (
    <div className='container'>
      <div className='spacing' />
      <p className='block-title'>Validator #{id}</p>
      <Card className='block-detail-card'>
        <table className='table'>
          <tbody>
            <tr>
              <td>Block</td>
              <td>
                <Link to={`/blocks/${data?.blockHeight}`}>
                  <p>#{formatNumber(data?.blockHeight)}</p>
                </Link>
              </td>
            </tr>
            <tr>
              <td>Time</td>
              <td>{timeDuration(data?.timestamp)}</td>
            </tr>
            <tr>
              <td>Identity</td>
              <td>
                <Avatar style={{marginRight: '4px', backgroundColor: '#87d068'}} size="small" src={`https://avatars.dicebear.com/api/pixel-art/${data?.stashAddress}.svg`} />
                {data?.name}
              </td>
            </tr>
            <tr>
              <td>Stash</td>
              <td>
                <Link to={`/accounts/${data?.stashAddress}`}>
                  <Avatar style={{marginRight: '4px', backgroundColor: '#87d068'}} size="small" src={`https://avatars.dicebear.com/api/pixel-art/${data?.stashAddress}.svg`} />
                  {data?.stashAddress}
                </Link>
              </td>
            </tr>
            <tr>
              <td>Controller</td>
              <td>
                <Link to={`/accounts/${data?.controllerAddress}`}>
                  <Avatar style={{marginRight: '4px', backgroundColor: '#87d068'}} size="small" src={`https://avatars.dicebear.com/api/pixel-art/${data?.controllerAddress}.svg`} />
                  {data?.controllerAddress}
                </Link>
              </td>
            </tr>
            <tr>
              <td>Commission</td>
              <td>{data?.commissionRating}%</td>
            </tr>
            <tr>
              <td>Total Stake</td>
              <td>{formatNumber(data?.totalStake)} SEL</td>
            </tr>
          </tbody>
        </table>
      </Card>
      <div className='spacing'/>
      { !loading &&
        <Tabs size='large'>
          <Tabs.TabPane tab='Nomination' key='nomination'>
            <Table
              loading={loading}
              pagination={false}
              dataSource={data?.nominations}
              className='table-styling'
            >
              <Table.Column title='Address' dataIndex='staking' 
                render={staking => (
                  <Link to={`/accounts/${staking}`}>
                    <Row>
                      <Avatar style={{marginRight: '4px', backgroundColor: '#87d068'}} size="small" src={`https://avatars.dicebear.com/api/pixel-art/${staking}.svg`} />
                      <p>{shortenAddress(staking)}</p>
                    </Row>
                  </Link>
                )}
              />
              <Table.Column title='Amount' dataIndex='amount'
                render={amount => (
                  <p>{formatNumber(amount)} SEL</p>
                )}
              />
            </Table>
          </Tabs.TabPane>
          <Tabs.TabPane tab='Staking' key='staking'>
            <Table
              loading={loading}
              pagination={false}
              dataSource={stakeHistory}
              className='table-styling'
            >
              <Table.Column title='Era' dataIndex='era' />
              <Table.Column title='Self' dataIndex='self'
                render={self => (
                  <p>{FormatBalance(self)} SEL</p>
                )}
              />
              <Table.Column title='Total' dataIndex='total'
                render={total => (
                  <p>{FormatBalance(total)} SEL</p>
                )}
              />
            </Table>
          </Tabs.TabPane>
          <Tabs.TabPane tab='Era' key='era'>
            <Table
              loading={loading}
              pagination={false}
              dataSource={eraPointsHistory}
              className='table-styling'
            >
              <Table.Column title='Era' dataIndex='era' />
              <Table.Column title='Point' dataIndex='points'
                render={points => (
                  <p>{formatNumber(points)}</p>
                )}
              />
            </Table>
          </Tabs.TabPane>
        </Tabs>
      }
    </div>
  )
}
