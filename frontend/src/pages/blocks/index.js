import { Button, Col, Input, Row } from "antd";
import React, { useState } from "react";
import BlocksTable from "../../components/BlocksTable";
import useFetch from "../../hooks/useFetch";

export default function Blocks() {
  const [page, setPage] = useState(1);
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/block/all/${page}`
  );
  console.log(data);

  return (
    <div>
      <div className="blocks-bg">
        <div className="container">
          <p className="blocks-title">Blocks</p>
          <Row gutter={[16, 16]}>
            <Col xs={18} sm={18} md={20} lg={20} xl={20}>
              <Input
                placeholder="Search by block number"
                className="home-search"
              />
            </Col>
            <Col xs={6} sm={6} md={4} lg={4} xl={4}>
              <Button className="home-search-btn">Search</Button>
            </Col>
          </Row>
          <div className="spacing" />
          <div>
            <BlocksTable loading={loading} data={data} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
