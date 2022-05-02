import { useEffect, useState } from 'react'
import { Card, Col, Progress, Row } from 'antd'
import TableStaking from '../components/TableStaking';

export default function Staking() {
  const [data, setData] = useState();
  
  useEffect(() => {
    Promise.all([
      fetch(`${process.env.REACT_APP_API}/staking/status`),
      fetch(`${process.env.REACT_APP_API}/staking/feature_of_week`),
      fetch(`${process.env.REACT_APP_API}/staking/validators`),
    ])
    .then(async([a, b, c]) => {
      const status = await a.json();
      const feature_of_week = await b.json();
      const validators = await c.json();

      setData({
        status,
        feature_of_week,
        validators
      })
    })
    .catch(err => {
      console.log(err);
    })
  },[])

  return (
    <div className='blocks-bg'>
      <div className='container'>
        <p className='blocks-title'>Validator</p>
        <Card style={{borderRadius: '8px'}}>
          <Row justify='space-between'>
            <Col span={8}>
              <Row>
                <Col xs={24} sm={24} md={8} lg={8} xl={8}>
                  <center>
                    <img 
                      src='/assets/icons/validator.svg'
                      alt=''
                      width={32}
                    />
                    <p>Validators</p>
                    <p>{data?.status.activeValidatorCount}</p>
                  </center>
                </Col>
                <Col xs={24} sm={24} md={8} lg={8} xl={8}>
                  <center>
                    <img 
                      src='/assets/icons/timer.svg'
                      alt=''
                      width={32}
                    />
                    <p>Waiting</p>
                    <p>{data?.status.waitingValidatorCount}</p>
                  </center>
                </Col>
              </Row>
            </Col>
            <Col span={14}>
              <Row justify='start'>
                <Col xs={24} sm={24} md={8} lg={8} xl={8}>
                  <Row justify='space-between'>
                    <p>Era</p>
                    <p>{data?.status.activeEra}/{data?.status.currentEra}</p>
                  </Row>
                  <Progress strokeColor='#00A9F9' percent={100} showInfo={false} />
                </Col>
              </Row>
            </Col>            
          </Row>
        </Card>
        <div className='spacing' />
        <TableStaking data={data?.validators} />
      </div>
    </div>
  )
}
