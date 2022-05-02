import { Card, Col, Row, Select } from 'antd';
import React, { useState } from 'react'
import EventsTable from '../components/EventsTable'
import useFetch from '../hooks/useFetch';

const module = [
  'all',
  'system',
];

export default function Events() {
  const [selectedModule, setSelectedModule] = useState('all');
  const [page, setPage] = useState(1);
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/event/${selectedModule}/${page}`
  );
  console.log(data);

  function handleChangeModule(value) {
    setSelectedModule(value);
    setPage(1);
    console.log(`selected: ${value}`);
  }

  return (
    <div className='blocks-bg'>
      <div className='container'>
        <p className='blocks-title'>Events</p>
        <Card style={{borderRadius: '8px'}}>
          <Row align="middle" gutter={[32, 32]}>
            <Col>
              <span style={{paddingRight: '4px'}}>Module:</span>
              <Select style={{ width: '180px' }} defaultValue="all" placeholder="Module" onChange={handleChangeModule}>
                { module.map((i, key) => 
                  <Select.Option key={key} value={i}>{i.toUpperCase()}</Select.Option>
                )}
              </Select>
            </Col>
          </Row>
        </Card>
        <div className="spacing" />
        <EventsTable 
          loading={loading}
          data={data}
          onChange={setPage}
        />
      </div>
    </div>
  )
}
