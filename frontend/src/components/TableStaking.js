import { Avatar, Row, Table } from "antd";
import React from "react";
import { Link } from "react-router-dom";
import { formatNumber, shortenAddress } from "../utils";

export default function TableStaking({ loading, data, short, onChange }) {
  return (
    <Table
      dataSource={data?.validators}
      rowKey={(record) => record.stashAddress}
      loading={loading}
      className="table-styling"
      tableLayout="fixed"
      // pagination={short ? false : {
      //   pageSize: 10,
      //   total: data?.total_page,
      //   onChange:(page) => {
      //     onChange(page)
      //   }
      // }}
    >
      <Table.Column
        title="Validator"
        dataIndex="stashAddress"
        render={(stashAddress) => (
          <Link to={`/validator/${stashAddress}`}>
            <Row>
              <Avatar style={{marginRight: '4px', backgroundColor: '#87d068'}} size="small" src={`https://avatars.dicebear.com/api/pixel-art/${stashAddress}.svg`} />
              <p>{shortenAddress(stashAddress)}</p>
            </Row>
          </Link>
        )}
      />
      <Table.Column
        title="Total stake"
        dataIndex="totalStake"
        render={(totalStake) => <p>{formatNumber(totalStake)} SEL</p>}
      />
      <Table.Column title="Nominator" dataIndex="nominators" />
      {/* <Table.Column 
        title="Active Eras"
        responsive={['md']}
        dataIndex="activeEras" 
      /> */}
    </Table>
  );
}
