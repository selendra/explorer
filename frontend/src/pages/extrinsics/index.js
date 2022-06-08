import { Card, Col, Row, Select } from "antd";
import { useState } from "react";
import ExtrinsicsTable from "../../components/ExtrinsicsTable";
import useFetch from "../../hooks/useFetch";
import LaodingLogo from "../../assets/loading.png";

const module = [
  "all",
  "timestamp",
  "paraInherent",
  "utility",
  "balances",
  "staking",
];

export default function Extrinsics() {
  const [isSigned, setIsSigned] = useState(false);
  const [selectedModule, setSelectedModule] = useState("all");
  const [page, setPage] = useState(1);
  const { loading, data = [] } = useFetch(
    isSigned
      ? `${process.env.REACT_APP_API}/extrinsic/signed/${page}`
      : `${process.env.REACT_APP_API}/extrinsic/${selectedModule}/${page}`
  );

  function handleChangeModule(value) {
    setSelectedModule(value);
    setPage(1);
    console.log(`selected: ${value}`);
  }

  return (
    <div>
      <div className="blocks-bg">
        <div className="container">
          <p className="blocks-title">Extrinsics</p>
          <Card style={{ borderRadius: "8px" }}>
            <Row align="middle" gutter={[32, 32]}>
              <Col>
                <span style={{ paddingRight: "4px" }}>Sign</span>
                <Select
                  style={{ width: "180px" }}
                  defaultValue="All"
                  onChange={setIsSigned}
                >
                  <Select.Option value={false}>ALL</Select.Option>
                  <Select.Option value={true}>SIGNED ONLY</Select.Option>
                </Select>
              </Col>
              <Col>
                <span style={{ paddingRight: "4px" }}>Module</span>
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
          </Card>
          <div className="spacing" />
          <ExtrinsicsTable
            // loading={loading}
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
    </div>
  );
}
