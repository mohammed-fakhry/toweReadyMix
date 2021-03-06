import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { AuthService } from '../services/auth.service';
import { GlobalVarsService } from '../services/global-vars.service';
import { StockService } from '../services/stock.service';
import { SafeService } from '../services/safe.service';
import { CustomerService } from '../services/customer.service';
import { Customer } from '../classes/customer';
import { Chart } from 'chart.js';
import { OtherAcc } from '../classes/other-acc';
import { MainService } from '../services/main.service';
import { SafeData } from '../classes/safe-data';
import { Stock } from '../classes/stock';
import { TruckService } from '../services/truck.service';
import { TruckCustomer } from '../classes/truck-customer';
import { ConcreteCustomer } from '../classes/concrete-customer';
import { ConcreteService } from '../services/concrete.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  homeLogo: HTMLElement = document.querySelector('#homeLogo') as HTMLElement;
  lastIvoices: MatTableDataSource<any> | any;
  lastReciepts: MatTableDataSource<any> | any;
  customersInfo!: {
    customers: number;
    remain: { count: number; total: number; uncompletedCond: number };
    onUs: { count: number; total: number; uncompletedCond: number };
    activeCustomers: {
      remain: { count: number; total: number; uncompletedCond: number };
      onUs: { count: number; total: number; uncompletedCond: number };
    };
    concreteCustomers: {
      remain: { count: number; total: number };
    };
    truckCustomers: {
      remain: { count: number; total: number };
    };
    gaurdsCustomers: {
      remain: { count: number; total: number };
    };
    monthlyPaidCustomers: {
      remain: { count: number; total: number };
    };
  };

  reportDate!: string;

  mainSafe: SafeData = new SafeData();
  safesList: SafeData[] = [];
  mainStock: Stock = new Stock();

  /* showChart: {
    sales: boolean;
    income: boolean;
  } = {
    sales: false,
    income: false,
  }; */

  counts!: {
    invoices: {
      count: number;
      total: number;
      uncompletedCond: number;
    };
    ActiveInvoices: {
      count: number;
      total: number;
      uncompletedCond: number;
    };
    recipts: {
      in: {
        count: number;
        total: number;
      };
    };
    ActiveRecipts: {
      in: {
        count: number;
        total: number;
      };
    };
    pointOfSale: {
      in: {
        count: number;
        total: number;
      };
    };
  };

  PieChart!: any;
  pieChartSales!: any;
  dataTo!: string;
  privateLoading: boolean = true;
  salesChartLoading: boolean = false;

  refreshBtn: boolean = false;
  displayedColumns: any = {
    lastIvoices: ['date_time', 'transactionType', 'customerName', 'total'],
    lastReciepts: ['date_time', 'receiptKind', 'receiptDetail', 'receiptVal'],
  };

  salesReportHeader = {
    subtitle: '?????????? ???????????? ?????? ???????? 7 ????????',
    btns: {
      dailyBtn: {
        title: '?????????? ????????',
        disabled: true,
      },
      monthlyBtn: {
        title: '?????????? ????????',
        disabled: false,
      },
    },
    mainBtn: '?????????? ????????...',
  };

  showReports: boolean = true;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    public _glopal: GlobalVarsService,
    public _auth: AuthService,
    public _stockService: StockService,
    public _safeService: SafeService,
    public _mainService: MainService,
    public _customerService: CustomerService,
    public _truckService: TruckService,
    public _concrete: ConcreteService
  ) {
    this._glopal.loading = true;
    this.privateLoading = true;

    this._glopal.currentHeader = `???????????????? | ${this._mainService.makeDate(
      new Date(Date.now())
    )}`;

    this.counts = this.generateCounts();
  }

  ngOnInit(): void {
    this.homeLogo = document.querySelector('#homeLogo') as HTMLElement;
    this.homeLogo.style.display = 'block';
    setTimeout(() => {
      let checkSession = sessionStorage.getItem('y');
      if (checkSession) this._auth.check = JSON.parse(checkSession);
      // this._glopal.currentHeader = '????????????????';
    }, 50);
    this.onStart();
    // this._mainService.playIntro()
    //this.generateChart()
  }

  onStart(newDate?: string) {
    this.refreshBtn = false;
    if (!this._glopal.loading) this._glopal.loading = true;
    this.privateLoading = true;
    this.showReports = true;
    if (!newDate)
      this.reportDate = this._mainService.makeDate(new Date(Date.now()));
    this._glopal.currentHeader = `???????????????? | ${this.reportDate}`;
    Promise.all([
      this.getLastInvoices(),
      this.getLastReciepts(),
      this.getCustomers(),
      this.getcountInvoices(this.reportDate),
      this.getcountReciepts(this.reportDate),
      this.getOtherAcc(),
      // this.getSalesReport('daily'),
      this.getSafe(),
      this.getStocks(),
      this.getConcreteCustomers(),
      this.getTruckCustomers(),
    ])
      .then((data: any) => {
        const result = {
          lastInvoices: data[0],
          lastReciepts: data[1],
          customers: data[2].filter(
            (cust: any) => !cust.customerName.includes('??????????')
          ),
          invoicesCounts: data[3][0],
          activeInvoicesCounts: data[3][1],
          recieptCounts: data[4][0],
          ActiveRecieptCounts: data[4][1],
          pointOfSaleCounts: data[4][2],
          otherAcc: data[5].filter((acc: OtherAcc) => acc.currentAccVal > 0),
          safe: data[6],
          stocks: data[7],
          concreteCustomers: data[8],
          truckCustomers: data[9],
        };

        this.mainSafe = result.safe[0];

        this.getSalesReport('daily', this.mainSafe.safeId).then((data: any) => {
          const sales = {
            invoices: data[0]?.length > 0 ? data[0].reverse() : [],
            income: data[1]?.length > 0 ? data[1].reverse() : [],
          };

          this.charts = {
            showExpenses: result.otherAcc.length > 0 ? true : false,
            showSales:
              sales.invoices.length > 0 || sales.income.length > 0
                ? true
                : false,
          };

          const domCharts = {
            pieChart: document.querySelector('#pieChart') as HTMLElement,
            pieChartSales: document.querySelector(
              '#pieChartSales'
            ) as HTMLElement,
          };

          if (domCharts.pieChart && domCharts.pieChartSales) {
            if (newDate) {
              // this.up
              this.changeSalesReport('daily', this.mainSafe.safeId);
            } else {
              this.generateChart(
                result.otherAcc,
                sales.invoices,
                sales.income,
                'daily'
              );
            }
          }
        });

        this.customersInfo = this.countCustomers(
          result.customers,
          result.concreteCustomers,
          result.truckCustomers
        );

        this.safesList = result.safe;
        this.mainStock = result.stocks[0];

        this.counts = this.generateCounts(
          result.invoicesCounts,
          result.activeInvoicesCounts,
          result.recieptCounts,
          result.ActiveRecieptCounts,
          result.pointOfSaleCounts
        );

        this.fillListData('lastIvoices', result.lastInvoices);
        this.fillListData('lastReciepts', result.lastReciepts);

        this._glopal.loading = false;
        this.privateLoading = false;
        const dateRecieved = this._mainService.makeTime_date(
          new Date(Date.now())
        );

        this.dataTo = this.compareMiniuts(dateRecieved);

        this.refreshCounter(dateRecieved);
        this.refreshBtn = false;

        setTimeout(() => {
          this.refreshBtn = true;
          this.compareMiniuts(dateRecieved);
          this.refreshCounter(dateRecieved);
        }, 5000);
      })
      .catch((error) => console.log(error));
  }

  generateCounts(
    invoicesCounts?: any,
    activeInvoicesCounts?: any,
    recieptCounts?: any,
    ActiveRecieptCounts?: any,
    pointOfSaleCounts?: any
  ) {
    return {
      invoices: {
        count: invoicesCounts?.invoices ?? 0,
        total: invoicesCounts?.total ?? 0,
        uncompletedCond: invoicesCounts?.uncompletedCond ?? 0,
      },
      ActiveInvoices: {
        count: activeInvoicesCounts?.invoices ?? 0,
        total: activeInvoicesCounts?.total ?? 0,
        uncompletedCond: activeInvoicesCounts?.uncompletedCond ?? 0,
      },
      recipts: {
        in: {
          count: recieptCounts?.reciepts ?? 0,
          total: recieptCounts?.total ?? 0,
        },
      },
      ActiveRecipts: {
        in: {
          count: ActiveRecieptCounts?.reciepts ?? 0,
          total: ActiveRecieptCounts?.total ?? 0,
        },
      },
      pointOfSale: {
        in: {
          count: pointOfSaleCounts?.reciepts ?? 0,
          total: pointOfSaleCounts?.total ?? 0,
        },
      },
    };
  }

  compareMiniuts(oldDate: string): string {
    var now: any = new Date();
    var oldTime: any = new Date(oldDate);
    var remTime = now - oldTime;

    var s = Math.floor(remTime / 1000);
    var m = Math.floor(s / 60);
    var h = Math.floor(m / 60);
    var d = Math.floor(h / 24) - 30;

    h %= 24;
    m %= 60;
    s %= 60;

    if (h > 0) {
      return h == 1 ? `?????? ?????????? ?????? ????????` : `?????? ?????????? ?????? ?????? ??????????`;
    } else if (m > 0) {
      if (m == 1) {
        return '?????? ?????????? ?????? ??????????';
      } else if (m < 15) {
        return '?????? ?????????? ?????? ?????? ??????????';
      } else if (m >= 15 && m < 30) {
        return '?????? ?????????? ?????? ?????? ????????';
      } else if (m >= 30 && m < 45) {
        return '?????? ?????????? ?????? ?????? ????????';
      } else if (m >= 45) {
        return '?????? ?????????? ?????? ???????? ?????? ?????? ????????????';
      }
    } else if (s > 0) {
      return '?????? ?????????? ?????? ??????????';
    }
    return '';
  }

  refreshCounter(oldDate: string) {
    let remain = this.compareMiniuts(oldDate);
    if (this.showReports) {
      if (remain == '?????? ?????????? ?????? ??????????') {
        setTimeout(() => {
          this.refreshCounter(oldDate);
          this.dataTo = this.compareMiniuts(oldDate);
        }, 20000);
      } else if (remain == '?????? ?????????? ?????? ??????????') {
        setTimeout(() => {
          this.refreshCounter(oldDate);
          this.dataTo = this.compareMiniuts(oldDate);
        }, 35000);
      } else if (remain == '?????? ?????????? ?????? ?????? ??????????') {
        setTimeout(() => {
          this.refreshCounter(oldDate);
          this.dataTo = this.compareMiniuts(oldDate);
        }, 900000);
      } else if (remain == '?????? ?????????? ?????? ?????? ????????') {
        this.showReports = false;
      }
    }
  }

  generateChart = (
    expenses: OtherAcc[],
    monthlySales: any[],
    inCome: any[],
    duration: string
  ) => {
    if (expenses.length > 0) {
      this.charts.showExpenses = true;

      Chart.defaults.global.defaultFontSize = 13;
      Chart.defaults.global.defaultFontFamily =
        '"Droid Arabic Kufi", "sans-serif"';

      this.PieChart = new Chart('pieChart', {
        type: 'doughnut',
        data: {
          labels: expenses.map((sub) => sub.AccName),
          datasets: [
            {
              label: '????????????????',
              data: expenses.map((sub) => sub.currentAccVal),
              maxBarThickness: 50,
              backgroundColor: this._glopal.colorPlate.map(
                (c: string) => `rgba(${c}, 0.8)`
              ),
              borderWidth: 1,
            },
          ],
        },
        options: {
          legend: {
            display: false,
          },
          scales: {
            yAxes: [
              {
                ticks: {
                  beginAtZero: true,
                },
              },
            ],
          },
        },
      });
    } else {
      this.charts.showExpenses = false;
    }

    this.makeSalesChart(monthlySales, inCome, duration);
  };

  charts: {
    showSales: boolean;
    showExpenses: boolean;
  } = {
    showSales: false,
    showExpenses: false,
  };

  makeSalesChart(monthlySales: any[], inCome: any[], duration: string) {
    if (monthlySales.length > 0 || inCome.length > 0) {
      this.charts.showSales = true;
      let labels = this.salesLabels(monthlySales, inCome, duration);

      this.pieChartSales = new Chart('pieChartSales', {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: '???????? ????????????????',
              data: monthlySales.map((sales) => sales.totalSales),
              maxBarThickness: 50,
              backgroundColor: ['rgb(0, 0, 0, 0)'],
              borderColor: ['#228fd9'],
              borderWidth: 2,
            },
            {
              label: '???????? ??????????',
              data: inCome.map((inc) => inc.totalSales),
              maxBarThickness: 50,
              backgroundColor: ['rgb(0, 0, 0, 0)'],
              borderColor: ['#c952ce'],
              borderWidth: 2,
            },
          ],
        },
        options: {
          scales: {
            yAxes: [
              {
                ticks: {
                  beginAtZero: true,
                },
              },
            ],
          },
        },
      });
    } else {
      this.charts.showSales = false;
    }
  }

  changeSalesReport(duration: string, safeId: number) {
    this.salesChartLoading = true;
    this.getSalesReport(duration, safeId).then((data: any) => {
      const sales = {
        invoices: data[0]?.length > 0 ? data[0].reverse() : [],
        income: data[0]?.length > 0 ? data[1].reverse() : [],
      };

      if (sales.invoices.length > 0 || sales.income.length > 0) {
        this.charts.showSales = true;

        this.salesReportHeader = {
          subtitle:
            duration === 'daily'
              ? '?????????? ???????????? ?????? ???????? 7 ????????'
              : '?????????? ???????????? ?????? ???????? ??????',
          btns: {
            dailyBtn: {
              title: '?????????? ????????',
              disabled: duration === 'monthly' ? false : true,
            },
            monthlyBtn: {
              title: '?????????? ????????',
              disabled: duration === 'monthly' ? true : false,
            },
          },
          mainBtn: duration === 'monthly' ? '?????????? ????????...' : '?????????? ????????...',
        };

        this.updateSalesChart(sales.invoices, sales.income, duration);
      } else {
        this.charts.showSales = false;
      }

      this.salesChartLoading = false;
    });
  }

  dateFromDay(year: any, day: any) {
    let date = new Date(year, 0);
    const fullDate = new Date(date.setDate(day));
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  dayNameToAr(dayName: string, year: string, dayofYear: string): string {
    const dayesNames = [
      {
        english: 'Sunday',
        arabic: `?????????? ${this.dateFromDay(year, dayofYear)}`,
      },
      {
        english: 'Monday',
        arabic: `?????????????? ${this.dateFromDay(year, dayofYear)}`,
      },
      {
        english: 'Tuesday',
        arabic: `???????????????? ${this.dateFromDay(year, dayofYear)}`,
      },
      {
        english: 'Wednesday',
        arabic: `???????????????? ${this.dateFromDay(year, dayofYear)}`,
      },
      {
        english: 'Thursday',
        arabic: `???????????? ${this.dateFromDay(year, dayofYear)}`,
      },
      {
        english: 'Friday',
        arabic: `???????????? ${this.dateFromDay(year, dayofYear)}`,
      },
      {
        english: 'Saturday',
        arabic: `?????????? ${this.dateFromDay(year, dayofYear)}`,
      },
    ];

    let newName = dayesNames.find(
      (day: any) => day.english === dayName
    )?.arabic;

    return newName ? newName : '';
  }

  salesLabels(newData: any[], inCome: any[], duration: string) {
    let labelsArry: string[] = [];

    for (let i = 0; i < newData.length; i++) {
      let labelName = '';
      if (duration === 'daily') {
        if (
          `${this.dayNameToAr(
            newData[i].yearMonth,
            newData[i].year,
            newData[i].dayOfYear
          )}` ===
          `${this.dayNameToAr(
            inCome[i]?.yearMonth,
            inCome[i]?.year,
            inCome[i]?.dayOfYear
          )}`
        ) {
          labelName = `${this.dayNameToAr(
            newData[i].yearMonth,
            newData[i].year,
            newData[i].dayOfYear
          )}`;
        } else {
          /* if sales date not the same as cashIncome date */
          labelName = `${this.dayNameToAr(
            inCome[i]?.yearMonth,
            inCome[i]?.year,
            inCome[i]?.dayOfYear
          )} | ${this.dayNameToAr(
            newData[i].yearMonth,
            newData[i].year,
            newData[i].dayOfYear
          )}`;
        }
      } else {
        /* if duration is monthly */
        if (newData[i].yearMonth === inCome[i]?.yearMonth) {
          labelName = `${newData[i].yearMonth}`;
        } else {
          labelName = `${inCome[i]?.yearMonth ? inCome[i]?.yearMonth : ''} | ${
            newData[i].yearMonth
          } `;
        }
      }

      labelsArry = [...labelsArry, labelName];
    }

    return labelsArry;
  }

  updateSalesChart(newData: any[], inCome: any[], duration: string) {
    let labels = this.salesLabels(newData, inCome, duration);

    this.pieChartSales.data.labels = labels;
    this.pieChartSales.data.datasets[0].data = newData.map(
      (sales) => sales.totalSales
    );
    this.pieChartSales.data.datasets[1].data = inCome.map(
      (inc) => inc.totalSales
    );
    this.pieChartSales.update();
  }

  countCustomers = (
    customers: Customer[],
    concreteCustomers: ConcreteCustomer[],
    truckCustomers: TruckCustomer[]
  ): {
    customers: number;
    remain: { count: number; total: number; uncompletedCond: number };
    onUs: { count: number; total: number; uncompletedCond: number };
    activeCustomers: {
      remain: { count: number; total: number; uncompletedCond: number };
      onUs: { count: number; total: number; uncompletedCond: number };
    };
    concreteCustomers: {
      remain: { count: number; total: number };
    };
    truckCustomers: {
      remain: { count: number; total: number };
    };
    gaurdsCustomers: {
      remain: { count: number; total: number };
    };
    monthlyPaidCustomers: {
      remain: { count: number; total: number };
    };
  } => {
    const mainFilter = customers.filter(
      (cust: Customer) =>
        !cust.customerName.includes('??????????') &&
        !cust.customerName.includes('?????? ??????????') &&
        !cust.customerName.includes('- ????????') &&
        !cust.customerName.includes('??????')
    );

    const custRemain = mainFilter.filter(
      (cus) =>
        cus.customerRemain > 0 &&
        !cus.customerAdd.includes('??????????') &&
        !cus.customerAdd.includes('?????????? ????????????')
    );
    const custOnUs = mainFilter.filter(
      (cus) =>
        cus.customerRemain < 0 &&
        !cus.customerAdd.includes('??????????') &&
        !cus.customerAdd.includes('?????????? ????????????')
    );

    const gaurdsCustomers = mainFilter.filter(
      (cus) =>
        cus.customerRemain != 0 && cus.customerAdd.includes('?????????? ????????????')
    );
    const monthlyPaidCustomers = mainFilter.filter(
      (cus) => cus.customerRemain != 0 && cus.customerAdd.includes('??????????')
    );

    const activeCustomers = {
      custRemain: mainFilter.filter(
        (cus) => cus.customerRemain > 0 && cus.customerName.includes('--')
      ),
      custOnUs: mainFilter.filter(
        (cus) => cus.customerRemain < 0 && cus.customerName.includes('--')
      ),
    };

    return {
      customers: customers.length,
      remain: {
        count: custRemain.length,
        total: custRemain
          .map((cust: any) => cust.customerRemain)
          .reduce((a: number, b: number) => a + b, 0),
        uncompletedCond: custRemain.filter(
          (cust: Customer) => cust.uncompletedCond > 0
        ).length,
      },
      onUs: {
        count: custOnUs.length,
        total:
          custOnUs
            .map((cust: any) => cust.customerRemain)
            .reduce((a: number, b: number) => a + b, 0) * -1,
        uncompletedCond: custOnUs.filter(
          (cust: Customer) => cust.uncompletedCond > 0
        ).length,
      },
      activeCustomers: {
        remain: {
          count: activeCustomers.custRemain.length,
          total: activeCustomers.custRemain
            .map((cust: any) => cust.customerRemain)
            .reduce((a: number, b: number) => a + b, 0),
          uncompletedCond: activeCustomers.custRemain.filter(
            (cust: Customer) => cust.uncompletedCond > 0
          ).length,
        },
        onUs: {
          count: activeCustomers.custOnUs.length,
          total:
            activeCustomers.custOnUs
              .map((cust: any) => cust.customerRemain)
              .reduce((a: number, b: number) => a + b, 0) * -1,
          uncompletedCond: activeCustomers.custOnUs.filter(
            (cust: Customer) => cust.uncompletedCond > 0
          ).length,
        },
      },
      concreteCustomers: {
        remain: {
          count: concreteCustomers.filter((cust) => cust.currentVal != 0)
            .length,
          total: concreteCustomers
            .map((cust) => cust.currentVal)
            .reduce((a, b) => a + b, 0),
        },
      },
      truckCustomers: {
        remain: {
          count: truckCustomers.filter(
            (cust) => cust.currentVal != 0 && cust.fullName != '?????????? ???? ????????????'
          ).length,
          total: truckCustomers
            .filter((cust) => cust.fullName != '?????????? ???? ????????????')
            .map((cust) => cust.currentVal)
            .reduce((a, b) => a + b, 0),
        },
      },
      gaurdsCustomers: {
        remain: {
          count: gaurdsCustomers.length,
          total: gaurdsCustomers
            .map((cust) => cust.customerRemain)
            .reduce((a, b) => a + b, 0),
        },
      },
      monthlyPaidCustomers: {
        remain: {
          count: monthlyPaidCustomers.length,
          total: monthlyPaidCustomers
            .map((cust) => cust.customerRemain)
            .reduce((a, b) => a + b, 0),
        },
      },
    };
  };

  fillListData = (cond: string, data: any) => {
    if (cond === 'lastIvoices') {
      this.lastIvoices = new MatTableDataSource(data);
      this.lastIvoices.sort = this.sort;
    }

    if (cond === 'lastReciepts') {
      this.lastReciepts = new MatTableDataSource(data);
      this.lastReciepts.sort = this.sort;
    }
  };

  /* get from dataBase */
  getLastInvoices() {
    return new Promise((res) => {
      this._stockService
        .getLastInvoices()
        .subscribe((data: any[]) => res(data));
    });
  }

  getLastReciepts() {
    return new Promise((res) => {
      this._safeService.lastReciepts().subscribe((data: any[]) => res(data));
    });
  }

  getCustomers(): Promise<Customer[]> {
    return new Promise((res) => {
      this._customerService.getCustomer().subscribe((data: Customer[]) => {
        res(data);
      });
    });
  }

  getTruckCustomers(): Promise<TruckCustomer[]> {
    return new Promise((res, rej) => {
      this._truckService.truckCustomersList().subscribe(
        (data: TruckCustomer[]) => {
          res(data);
        },
        (err) => rej('no data')
      );
    });
  }

  getConcreteCustomers(): Promise<ConcreteCustomer[]> {
    return new Promise((res, rej) => {
      this._concrete.concreteCustomerList().subscribe(
        (data: ConcreteCustomer[]) => {
          res(data);
        },
        (err) => rej('no data')
      );
    });
  }

  getcountInvoices(date: string) {
    return new Promise((res) => {
      this._stockService
        .getcountInvoices(date)
        .subscribe((data: any[]) => res(data));
    });
  }

  getcountReciepts(date: string) {
    return new Promise((res) => {
      this._safeService
        .getcountReciepts(date)
        .subscribe((data: any[]) => res(data));
    });
  }

  getOtherAcc() {
    return new Promise((res) => {
      this._safeService
        .getOtherAcc()
        .subscribe((data: OtherAcc[]) => res(data));
    });
  }

  getSalesReport(duration: string, safeId: number) {
    return new Promise((res) => {
      this._stockService
        .getSalesReport(duration, safeId, this.reportDate)
        .subscribe((data: any[]) => res(data));
    });
  }

  getSafe() {
    return new Promise((res) => {
      this._safeService.getSafes().subscribe((data: SafeData[]) => {
        res(data);
      });
    });
  }

  getStocks() {
    return new Promise((res) => {
      this._stockService.getStockes().subscribe((data: Stock[]) => res(data));
    });
  }

  /* scrollTo(elementId: string) {
    const elmnt = document.getElementById(elementId);
    if (elmnt) {
      elmnt.scrollIntoView({
        behavior: 'smooth',
      });

      elmnt.style.transition = '350ms';
      elmnt?.classList.add('darkGrayBg','px-2');

      setTimeout(() => {
        elmnt.style.transition = '350ms';
        elmnt?.classList.remove('darkGrayBg','px-2');
      }, 700);
    }
  } */
}
