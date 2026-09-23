import {
  BarChart,
  Callout,
  Divider,
  Grid,
  H1,
  H2,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

export default function CaseEconomy() {
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>Экономика кейсов: цель 50%</H1>
        <Text tone="secondary">
          Шансы в каталоге пересчитаны так, чтобы продажа дропа возвращала
          половину цены кейса. Цены предметов и цена открытия те же. Проверка:
          1 млн спинов каждого кейса тем же взвешенным роллом, что в игре.
        </Text>
      </Stack>

      <Grid columns={4} gap={16}>
        <Stat value="50.0%" label="Клиенту остаётся, теория" tone="success" />
        <Stat value="50.0%" label="Симуляция, все 6 млн спинов" tone="success" />
        <Stat value="580 млн" label="Дом забирает, Мора" />
        <Stat value="1.16 млрд" label="Депозит на 6 млн спинов, Мора" />
      </Grid>

      <Callout tone="success" title="Цель 50% сходится">
        Математическое ожидание каждого кейса — ровно половина цены. На
        миллионе спинов отдельный кейс гуляет в пределах 49.8–50.2% из-за
        редких легендарок. Вместе шесть кейсов дают 50.01%: клиенту 580.1 млн
        из 1.16 млрд, дому 579.9 млн.
      </Callout>

      <Stack gap={8}>
        <H2>Возврат клиенту: было и стало</H2>
        <Text size="small" tone="tertiary">
          Ось X — кейс. Ось Y — доля депозита после продажи дропа, %. Линия —
          цель 50%. «Было» — прошлая симуляция 1 млн спинов до смены шансов.
          «Стало» — та же симуляция на новых весах. Источник:
          src/features/cases/data/cases.ts.
        </Text>
        <BarChart
          categories={["Anemo", "Pyro", "Hydro", "Electro", "Cryo", "Dendro"]}
          series={[
            {
              name: "Было, % депозита",
              data: [93.8, 96.7, 95.0, 128.1, 95.9, 129.1],
              tone: "danger",
            },
            {
              name: "Стало, % депозита",
              data: [50.1, 49.9, 49.8, 50.2, 49.9, 50.1],
              tone: "success",
            },
          ]}
          valueSuffix="%"
          yMax={140}
          referenceLines={[{ value: 50, label: "Цель 50%", tone: "warning" }]}
          height={240}
          showValues
        />
      </Stack>

      <Stack gap={8}>
        <H2>1 млн спинов каждого кейса</H2>
        <Table
          headers={[
            "Кейс",
            "Цена",
            "EV",
            "Теория",
            "Симуляция",
            "Дом",
          ]}
          columnAlign={["left", "right", "right", "right", "right", "right"]}
          rowTone={[
            "success",
            "success",
            "success",
            "success",
            "success",
            "success",
          ]}
          striped
          rows={[
            ["Anemo Breeze", "160", "80.0", "50.0%", "50.1%", "+79.8 млн"],
            ["Pyro Embers", "200", "100.0", "50.0%", "49.9%", "+100.2 млн"],
            ["Hydro Tide", "190", "95.0", "50.0%", "49.8%", "+95.4 млн"],
            ["Electro Pulse", "220", "110.0", "50.0%", "50.2%", "+109.6 млн"],
            ["Cryo Veil", "180", "90.0", "50.0%", "49.9%", "+90.1 млн"],
            ["Dendro Grove", "210", "105.0", "50.0%", "50.1%", "+104.8 млн"],
            ["Все кейсы", "—", "—", "50.0%", "50.0%", "+579.9 млн"],
          ]}
        />
        <Text size="small" tone="tertiary">
          Мора. Шансы в каждом кейсе суммируются в 100. Продажа идёт по полной
          стоимости предмета, комиссии нет.
        </Text>
      </Stack>

      <Divider />

      <Stack gap={8}>
        <H2>Новые шансы по редкости</H2>
        <Text size="small" tone="tertiary">
          Ось X — кейс. Ось Y — доля шанса редкости, %. Внутри редкости
          соотношение предметов сохранено: более дорогой по-прежнему реже.
          Легендарки срезаны сильнее всего — раньше Electro и Dendro
          выплачивали больше цены кейса.
        </Text>
        <BarChart
          stacked
          normalized
          categories={["Anemo", "Pyro", "Hydro", "Electro", "Cryo", "Dendro"]}
          series={[
            { name: "3★ common", data: [78.0, 77.6, 77.0, 83.6, 77.1, 83.7] },
            { name: "3★+ uncommon", data: [10.1, 10.3, 10.2, 6.8, 10.6, 6.8] },
            { name: "4★ rare", data: [7.5, 7.3, 7.9, 5.5, 7.5, 5.5] },
            { name: "4★+ epic", data: [3.8, 3.9, 4.0, 3.2, 4.0, 3.1] },
            { name: "5★ legendary", data: [0.66, 0.86, 0.88, 0.93, 0.88, 0.93] },
          ]}
          valueSuffix="%"
          height={240}
        />
        <Table
          headers={["Кейс", "3★", "3★+", "4★", "4★+", "5★"]}
          columnAlign={["left", "right", "right", "right", "right", "right"]}
          rows={[
            ["Anemo Breeze", "77.97%", "10.14%", "7.48%", "3.75%", "0.66%"],
            ["Pyro Embers", "77.64%", "10.33%", "7.31%", "3.86%", "0.86%"],
            ["Hydro Tide", "77.01%", "10.17%", "7.92%", "4.02%", "0.88%"],
            ["Electro Pulse", "83.64%", "6.79%", "5.47%", "3.17%", "0.93%"],
            ["Cryo Veil", "77.12%", "10.55%", "7.49%", "3.96%", "0.88%"],
            ["Dendro Grove", "83.68%", "6.77%", "5.54%", "3.08%", "0.93%"],
          ]}
        />
        <Text size="small" tone="tertiary">
          Апгрейд эти веса не использует: там равномерный выбор среди всех
          предметов целевой редкости.
        </Text>
      </Stack>
    </Stack>
  );
}
