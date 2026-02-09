export const hourFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

export const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0
});
