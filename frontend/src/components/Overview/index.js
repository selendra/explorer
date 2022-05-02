import { Col, Row } from "antd";

export default function Overview(props) {
  return (
    <div className="home-all-data">
      <Row justify="center" align="middle" gutter={[8, 8]}>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <Col>
            <p className="home-all-data-title">Last Block</p>
            <p className="home-all-data-data">#{props.total_blocks}</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Transfers</p>
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_transfers)}</p>
          </Col>
        </Col>
        <Col xs={4} sm={3} md={3} lg={3} xl={3}>
          <Row justify="center">
            <div className="home-divider" />
          </Row>
        </Col>
        <Col xs={10} sm={3} md={3} lg={3} xl={3}>
          <Col>
            <p className="home-all-data-title">Last Finalized</p>
            <p className="home-all-data-data">#{props.total_blocksFinalized}</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Accounts</p>
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_accounts)}</p>
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
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_extrinsics)}</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Total Validators</p>
            <p className="home-all-data-data">{props.total_validators.length}</p>
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
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_events)}</p>
          </Col>
          <Col>
            <p className="home-all-data-title">Total Nominator</p>
            <p className="home-all-data-data">#{new Intl.NumberFormat().format(props.total_nominators)}</p>
          </Col>
        </Col>
      </Row>
    </div>
  );
}


