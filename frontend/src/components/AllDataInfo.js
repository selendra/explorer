import { ApiPromise, WsProvider } from "@polkadot/api";
import { Col, Row } from "antd";
import { useEffect, useState } from "react";

export default function AllDataInfo() {
  const [lastBlock, setLastBlock] = useState("");

  return (
    <div className="home-all-data">
      <Row justify="center" align="middle" gutter={[8, 8]}>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <Col>
            <p className="home-all-data-title">Last Block</p>
            <p className="home-all-data-data">#{lastBlock}</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Transfers</p>
            <p className="home-all-data-data">#8,888,888</p>
          </Col>
        </Col>
        <Col xs={4} sm={3} md={3} lg={3} xl={3}>
          <Row justify="center">
            <div className="home-divider" />
          </Row>
        </Col>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <Col>
            <p className="home-all-data-title">Last Finalize</p>
            <p className="home-all-data-data">#8,888,888</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Accounts</p>
            <p className="home-all-data-data">#8,888,888</p>
          </Col>
        </Col>
        <Col xs={0} sm={3} md={3} lg={3} xl={3}>
          <Row justify="center">
            <div className="home-divider" />
          </Row>
        </Col>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <Col>
            <p className="home-all-data-title">Total Extrinsic</p>
            <p className="home-all-data-data">#8,888,888</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Total Validator</p>
            <p className="home-all-data-data">#8,888,888</p>
          </Col>
        </Col>
        <Col xs={4} sm={3} md={3} lg={3} xl={3}>
          <Row justify="center">
            <div className="home-divider" />
          </Row>
        </Col>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <Col>
            <p className="home-all-data-title">Total Events</p>
            <p className="home-all-data-data">#8,888,888</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Total Staked</p>
            <p className="home-all-data-data">#8,888,888</p>
          </Col>
        </Col>
      </Row>
    </div>
  );
}
