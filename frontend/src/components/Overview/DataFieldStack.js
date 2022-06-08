import { Col, Row } from "antd";

export default function DataField({ icon, title, data, isPercent }) {
  return (
    <Col xs={10} sm={8} md={8} lg={8} xl={8}>
      <Row gutter={[8, 8]} align="middle">
        <Col xs={24} sm={4} md={4} lg={4} xl={4}>
          <img src={icon} alt="" width={26} height={26} />
        </Col>
        <Col xs={24} sm={20} md={12} lg={12} xl={12}>
          <p className="home-all-data-title">{title}</p>
          <p className="home-all-data-data">
            {data} {isPercent && "%"}
          </p>
        </Col>
      </Row>
    </Col>
  );
}
