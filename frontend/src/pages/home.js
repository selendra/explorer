import { Button, Col, Input, Row } from "antd";
import AllDataInfo from "../components/AllDataInfo";
import BlocksTable from "../components/BlocksTable";
import ExtrinsicsTable from "../components/ExtrinsicsTable";
import useFetch from "../hooks/useFetch";

export default function Home() {
  const { loading: loadingBlocks, data: blockData = [] } = useFetch(
    `${process.env.REACT_APP_API}/blocks`
  );
  const { loading: loadingExtr, data: ExtrData = [] } = useFetch(
    `${process.env.REACT_APP_API}/extrinsics`
  );

  return (
    <div>
      <div className="home-container">
        <div className="home-info">
          <h1>Selendra Blockchain Explorer</h1>
          <div className="spacing" />
          <Row align="middle" gutter={[16, 16]}>
            <Col xs={18} sm={18} md={20} lg={20} xl={20}>
              <Input
                placeholder="Search by block number, block hash, extrinsic hash or account address"
                className="home-search"
              />
            </Col>
            <Col xs={6} sm={6} md={4} lg={4} xl={4}>
              <Button className="home-search-btn">Search</Button>
            </Col>
          </Row>
          <div className="spacing" />
          <AllDataInfo />
        </div>
      </div>
      <div className="home-info">
        <Row gutter={[16, { xs: 8, sm: 16, md: 24, lg: 32 }]}>
          <Col xs={24} md={12} lg={12} xl={12}>
            <p className="home-subTitle">Blocks</p>
            <BlocksTable short loading={loadingBlocks} data={blockData} />
          </Col>
          <Col xs={24} md={12} lg={12} xl={12}>
            <p className="home-subTitle">Extrinsic</p>
            <ExtrinsicsTable short loading={loadingExtr} data={ExtrData} />
          </Col>
        </Row>
      </div>
    </div>
  );
}
