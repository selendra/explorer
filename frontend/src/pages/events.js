import { Card, Col, Row, Select } from "antd";
import React, { useState } from "react";
import EventsTable from "../components/EventsTable";
import useFetch from "../hooks/useFetch";
import LaodingLogo from "../assets/loading.png";

const module = ["all", "system"];

export default function Events() {
  const [selectedModule, setSelectedModule] = useState("all");
  const [page, setPage] = useState(1);
  const { loading, data = [] } = useFetch(
    `${process.env.REACT_APP_API}/event/${selectedModule}/${page}`
  );

  function handleChangeModule(value) {
    setSelectedModule(value);
    setPage(1);
    console.log(`selected: ${value}`);
  }

  return (
    <div className="blocks-bg">
      <div className="container">
        <p className="blocks-title">Events</p>
        <div className="filter-bg">
          <Row align="middle" gutter={[32, 32]}>
            <Col>
              <span style={{ paddingRight: "4px" }}>Module:</span>
              <Select
                style={{ width: "180px" }}
                defaultValue="all"
                placeholder="Module"
                onChange={handleChangeModule}
              >
                {module.map((i, key) => (
                  <Select.Option key={key} value={i}>
                    {i.toUpperCase()}
                  </Select.Option>
                ))}
              </Select>
            </Col>
          </Row>
        </div>
        <div className="spacing" />
        <EventsTable
          loading={{
            indicator: (
              <div>
                <img className="loading-img-block" src={LaodingLogo} />
              </div>
            ),
            spinning: !data,
          }}
          data={data}
          onChange={setPage}
        />
      </div>
    </div>
  );
}
