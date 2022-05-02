import { Col, Dropdown, Menu, Row, Space } from "antd";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import SideHeader from "./SideHeader";

export default function HeaderComponent() {
  const menu = (
    <Menu>
      <Menu.Item>
        <Link to='/blocks'>
          <p>Blocks</p>
        </Link>
      </Menu.Item>
      <Menu.Item>
        <Link to='/extrinsics'>
          <p>Extrinsics</p>
        </Link>
      </Menu.Item>
      <Menu.Item>
        <Link to='/events'>
          <p>Events</p>
        </Link>
      </Menu.Item>
    </Menu>
  );
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
                  <p>Home</p>
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
                <Link to="/staking">
                  <p>Staking</p>
                </Link>
              </Col>
              <Col span={4}>
                <Dropdown overlay={menu} placement="bottomLeft" arrow>
                  <a onClick={e => e.preventDefault()}>
                    <Space>
                      <p>Blockchain</p>
                      <img alt='' src='/assets/icons/chevron-down.svg' width={16} />
                    </Space>
                  </a>
                </Dropdown>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
      <SideHeader />
    </div>
  );
}
