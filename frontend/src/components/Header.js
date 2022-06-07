import { Col, Dropdown, Menu, Row, Space } from "antd";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import SideHeader from "./SideHeader";

export default function HeaderComponent() {
  const menu = (
    <Menu>
      <Menu.Item key="blocks">
        <Link to="/blocks">
          <p>Blocks</p>
        </Link>
      </Menu.Item>
      <Menu.Item key="extrinsics">
        <Link to="/extrinsics">
          <p>Extrinsics</p>
        </Link>
      </Menu.Item>
      <Menu.Item key="events">
        <Link to="/events">
          <p>Events</p>
        </Link>
      </Menu.Item>
    </Menu>
  );
  return (
    <div>
      <div className="header">
        <div className="header-container">
          <div className="logo" style={{ marginRight: 18, paddingTop: "5px" }}>
            <Link to="/">
              <img src={logo} alt="" height={50} />
            </Link>
          </div>
          <div style={{ display: "flex", paddingTop: "5px" }}>
            <Link to="/">
              <p style={{ paddingRight: "90px" }}>Home</p>
            </Link>
            <Link to="/accounts">
              <p style={{ paddingRight: "90px" }}>Accounts</p>
            </Link>
            <Link to="/transfers">
              <p style={{ paddingRight: "90px" }}>Transfers</p>
            </Link>
            <Link to="/staking">
              <p style={{ paddingRight: "90px" }}>Staking</p>
            </Link>
            <Dropdown
              style={{ paddingRight: "20px" }}
              overlay={menu}
              placement="bottomLeft"
              arrow
            >
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  <p>Blockchain</p>
                  <img alt="" src="/assets/icons/chevron-down.svg" width={16} />
                </Space>
              </a>
            </Dropdown>
          </div>
        </div>
      </div>
      <SideHeader />
    </div>
  );
}
