import { Row } from "antd";
import DataField from "./DataField";

export default function Overview(props) {
  return (
    <div className="home-all-data">
      <Row justify="center" align="middle" gutter={[32, 32]}>
        <DataField
          icon="/assets/icons/box.svg"
          title="Blocks"
          data={props.total_blocks}
          isRoute='/blocks'
        />
        <DataField
          icon="/assets/icons/box-tick.svg"
          title="Finalized"
          data={props.total_blocksFinalized}
          isRoute='/blocks'
        />
        <DataField
          icon="/assets/icons/edit.svg"
          title="Extrinsics"
          data={new Intl.NumberFormat().format(props.total_extrinsicSigned)}
          isRoute='/extrinsics'
        />
        <DataField
          icon="/assets/icons/user-square.svg"
          title="Accounts"
          data={new Intl.NumberFormat().format(props.total_accounts)}
          isRoute='/accounts'
        />
        <DataField
          icon="/assets/icons/arrow-swap-horizontal.svg"
          title="Transfers"
          data={new Intl.NumberFormat().format(props.total_transfers)}
          isRoute='/transfers'
        />
        <DataField
          icon="/assets/icons/validator-white.svg"
          title="Validators"
          data={
            <div style={{ display: "flex" }}>
              {new Intl.NumberFormat().format(props.total_validators)}{" "}
              <span>/{props.waitingCount}</span>
            </div>
          }
        />

        <DataField
          icon="/assets/icons/profile-2user.svg"
          title="Balances"
          data={
            <div style={{ display: "flex" }}>
              {new Intl.NumberFormat().format(props.total_issuance)}{" "}
              <span>&nbsp;&nbsp;SEL</span>
            </div>
          }
        />
        <DataField
          icon="/assets/icons/lock.svg"
          title="Locked"
          data={
            <div style={{ display: "flex" }}>
              {new Intl.NumberFormat().format(props.total_lockBalance)}{" "}
              <span>&nbsp;&nbsp;SEL</span>
            </div>
          }
        />
      </Row>
    </div>
  );
}
