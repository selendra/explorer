import { Card, Col, Row, Tabs } from 'antd'
import React from 'react'
import { useParams } from 'react-router-dom'
import useFetch from '../../hooks/useFetch';
import { timeDuration } from '../../utils';
import ExtrinsicsTable from '../../components/ExtrinsicsTable';

export default function BlockDetail() {
  const { id } = useParams();
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/block/${id}`
  );
  console.log(data)

  if(loading) {
    return (
      <div className="container">
        <p>Loading</p>
      </div>
    )
  }

  let newData;
  if(!loading) {
    newData = [
      { title: 'Block Time', data: timeDuration(data?.timestamp) },
      { title: 'Status', data: data?.finalized },
      { title: 'Hash', data: data?.blockHash },
      { title: 'Parent Hash', data: data?.parentHash },
      { title: 'State Root', data: data?.stateRoot },
      { title: 'Extrinsics Root', data: data?.extrinsicsRoot },
      { title: 'Validators', data: data?.blockAuthor },
    ]
  }

  return (
    <div className='container'>
      <div className='spacing' />
      <p className='block-title'>Block #{id}</p>
      <Card className='block-detail-card' style={{borderRadius: '8px'}}>
        { newData.map((i, key) =>
          <Row gutter={[32,32]}>
            <Col span={4}>
              <p>{i.title}:</p>
            </Col>
            <Col span={20}>
              <p>{i.data}</p>
            </Col>
          </Row>
        )}
      </Card>
      <div className='spacing'/>
      <Tabs size='large'>
        <Tabs.TabPane tab='Extrinsics' key='extrinsics'>
          {/* 
          <ExtrinsicsTable 
            data={data}
            loading={loading}
          /> 
          */}
        </Tabs.TabPane>
        <Tabs.TabPane tab='Events' key='events'>

        </Tabs.TabPane>
        <Tabs.TabPane tab='Logs' key='logs'>

        </Tabs.TabPane>
      </Tabs>
    </div>
  )
}
