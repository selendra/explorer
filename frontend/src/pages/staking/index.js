import { useEffect, useState } from "react";
import { Card, Col, Row } from "antd";
import TableStaking from "../../components/TableStaking";
import DataField from "../../components/Overview/DataFieldStack";
import { calcInflation } from "../../utils/calcInflation";
import { useAPIState } from "../../context/APIContext";
import { BigNumber } from "bignumber.js";
import Loading from "../../components/Loading";
import Chart from "../../components/chart";

export default function Staking() {
  const { api } = useAPIState();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState();
  const [inflation, setInflation] = useState();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${process.env.REACT_APP_API}/staking/status`),
      fetch(`${process.env.REACT_APP_API}/totals/norminate`),
      fetch(`${process.env.REACT_APP_API}/staking/validators`),
      fetch(`${process.env.REACT_APP_API}/totals/staking`),
    ])
      .then(async ([a, b, c, d]) => {
        const status = await a.json();
        const norminate_balance = await b.json();
        const validators = await c.json();
        const total_staking = await d.json();

        setLoading(false);
        setData({
          status,
          norminate_balance,
          validators,
          total_staking,
          self_staking:
            Number(total_staking.totalStake) -
            Number(norminate_balance.otherStake),
        });
      })
      .catch((err) => {
        setLoading(false);
        // console.log(err);
      });
  }, []);

  useEffect(() => {
    async function calcInflationFunc() {
      const totalStake = data?.total_staking.totalStake;
      const issu = await api.query.balances.totalIssuance();
      // eslint-disable-next-line no-undef
      const totalIssuance = new BigNumber(issu)
        .dividedBy(Math.pow(10, 18))
        .toNumber();
      const inflation = calcInflation(totalStake, totalIssuance);
      // console.log(inflation);
      setInflation(inflation);
    }
    calcInflationFunc();
  }, [
    api.query.balances,
    api.query.balances.totalIssuance,
    data?.total_staking.totalStake,
  ]);

  if (loading)
    return (
      <div className="container">
        <Loading />
      </div>
    );

  return (
    <div>
      <div className="home-container">
        <div className="container">
          <p className="blocks-title">Validator</p>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={24} lg={19}>
              <Card className="staking">
                <Row justify="start" align="middle" gutter={[32, 32]}>
                  <DataField
                    icon="/assets/icons/box-time.svg"
                    title="Staking"
                    data={new Intl.NumberFormat().format(
                      data?.total_staking.totalStake
                    )}
                  />
                  <DataField
                    icon="/assets/icons/box-time.svg"
                    title="Self-Staking"
                    data={new Intl.NumberFormat().format(data?.self_staking)}
                  />
                  <DataField
                    icon="/assets/icons/norminate.svg"
                    title="Norminate"
                    data={new Intl.NumberFormat().format(
                      data?.norminate_balance.otherStake
                    )}
                  />
                  <DataField
                    icon="/assets/icons/validator-white.svg"
                    title="Validator"
                    data={new Intl.NumberFormat().format(
                      data?.validators.total_valalidaors
                    )}
                  />
                  <DataField
                    icon="/assets/icons/timer.svg"
                    title="Waiting"
                    data={new Intl.NumberFormat().format(
                      data?.status.waitingValidatorCount
                    )}
                  />
                  <DataField
                    icon="/assets/icons/candle.svg"
                    title="Inflation Rate"
                    data={new Intl.NumberFormat().format(inflation?.inflation)}
                    isPercent
                  />
                </Row>
              </Card>
            </Col>
            <Col xs={24} sm={24} md={24} lg={5}>
              <center className="staking">
                <Chart
                  dataEra={data?.status.activeEra}
                  datacurrentEra={data?.status.currentEra}
                />
                {/* <Row justify="space-between">
                  <p className="home-all-data-title">Era</p>
                  <p className="home-all-data-data">
                    {data?.status.activeEra}/{data?.status.currentEra}
                  </p>
                </Row>
                <Progress
                  percent={
                    (data?.status.activeEra / data?.status.currentEra) * 100
                  }
                  showInfo={false}
                  strokeColor="#03A9F4"
                /> */}
              </center>
            </Col>
          </Row>
        </div>
      </div>
      <div className="container">
        <div className="spacing" />
        <TableStaking data={data?.validators} />
      </div>
    </div>
  );
}
