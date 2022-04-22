import { Col, Row } from "antd";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import SideHeader from "./SideHeader";

export default function HeaderComponent() {
  return (
    <div>
      <div className="header">
        <Row
          className="header-container"
          justify="space-between"
          align="middle"
        >
          <Col span={6}>
            <Link to="/">
              <img src={logo} alt="" height={50} />
            </Link>
          </Col>
          <Col span={18}>
            <Row>
              <Col span={4}>
                <Link to="/">
                  <p>Explorer</p>
                </Link>
              </Col>
              <Col span={4}>
                <Link to="/blocks">
                  <p>Blocks</p>
                </Link>
              </Col>
              <Col span={4}>
                <Link to="/accounts">
                  <p>Accounts</p>
                </Link>
              </Col>
              <Col span={4}>
                <Link to="/transfers">
                  <p>Transfers</p>
                </Link>
              </Col>
              <Col span={4}>
                <Link to="/extrinsics">
                  <p>Extrinsics</p>
                </Link>
              </Col>
              <Col span={4}>
                <Link to="/events">
                  <p>Events</p>
                </Link>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
      <SideHeader />
    </div>
  );
}
