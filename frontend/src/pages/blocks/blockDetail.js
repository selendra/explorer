import { Card, Col, Row, Tabs } from 'antd'
import React from 'react'
import { useParams } from 'react-router-dom'
import useFetch from '../../hooks/useFetch';
import { timeDuration } from '../../utils';
import ExtrinsicsTable from '../../components/ExtrinsicsTable';

export default function BlockDetail() {
  const { id } = useParams();
  const { loading, error, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/blocks/${id}`
  );
  console.log(data)

  if(loading) {
    return (<p>loading</p>)
  }

  let newData;
  if(!loading) {
    newData = [
      { title: 'Block Time', data: timeDuration(data?.data?.blockTime) },
      { title: 'Status', data: '' },
      { title: 'Hash', data: data?.data?.hash },
      { title: 'Parent Hash', data: data?.data?.block.header.parentHash },
      { title: 'State Root', data: data?.data?.block.header.stateRoot },
      { title: 'Extrinsics Root', data: data?.data?.block.header.extrinsicsRoot },
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
          {/* <ExtrinsicsTable 
            data={data}
            loading={loading}
          /> */}
        </Tabs.TabPane>
        <Tabs.TabPane tab='Events' key='events'>

        </Tabs.TabPane>
        <Tabs.TabPane tab='Logs' key='logs'>

        </Tabs.TabPane>
      </Tabs>
    </div>
  )
}
