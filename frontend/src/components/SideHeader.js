import React, { useState } from "react";
import { Layout, Drawer, Row, Col } from "antd";
import menuWhite from "../assets/menu-white.svg";
import logo from "../assets/logo.png";
import logoWhite from "../assets/logo-white.png";

import { Link } from "react-router-dom";

const routes = [
  { name: "Explore", route: "/" },
  { name: "Blocks", route: "/blocks" },
  { name: "Accounts", route: "/accounts" },
  { name: "Transfers", route: "/transfers" },
  { name: "Extrinsics", route: "/extrinsics" },
  { name: "Events", route: "/events" },
  { name: "Staking", route: "/staking" },
];

function SideMenu() {
  const [visible, setVisible] = useState(false);
  const showDrawer = () => {
    setVisible(true);
  };
  const onClose = () => {
    setVisible(false);
  };

  return (
    <div className="">
      <div className="top-menu">
        <Drawer
          width="300"
          placement="right"
          closable={false}
          onClose={onClose}
          visible={visible}
          bodyStyle={{
            background: "#012D41",
          }}
        >
          <div style={{ padding: "", marginBottom: "30px" }}>
            <img src={logo} alt="selendra-logo" width="60%" />
          </div>
          <Row
            className="header-container"
            justify="space-between"
            align="middle"
          >
            <Col span={24}>
              <Row gutter={[8, 16]}>
                {routes.map((route, key) => {
                  const { route: link, name } = route;
                  return (
                    <Col span={24} key={key}>
                      <Link to={link}>
                        <p className="side-menu-text" onClick={() => onClose()}>
                          {name}
                        </p>
                      </Link>
                    </Col>
                  );
                })}
              </Row>
            </Col>
          </Row>
        </Drawer>

        <a href="/">
          <img src={logo} alt="selendra-logo" width="130px" />
        </a>

        <img
          className="mobile-menu-btn"
          onClick={showDrawer}
          src={menuWhite}
          alt="menu svg"
          width="25px"
        />
      </div>
    </div>
  );
}

export default SideMenu;
