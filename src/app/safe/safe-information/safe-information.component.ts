import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { SafeData } from 'src/app/classes/safe-data';
import { MainService } from 'src/app/services/main.service';
import { ActivatedRoute, Router } from '@angular/router';
import { GlobalVarsService } from 'src/app/services/global-vars.service';
import { SafeService } from 'src/app/services/safe.service';
import { MatDialog } from '@angular/material/dialog';
import { FilterByDateDialogComponent } from 'src/app/dialogs/filter-by-date-dialog/filter-by-date-dialog.component';
import { AccHeaderTotals } from 'src/app/classes/acc-header-totals';

@Component({
  selector: 'app-safe-information',
  templateUrl: './safe-information.component.html',
  styleUrls: ['./safe-information.component.scss'],
})
export class SafeInformationComponent implements OnInit {
  id: string | null = null;
  safeInfo: SafeData = new SafeData();

  calcArr: {
    arr: number[];
    total: number;
  } = { arr: [], total: 0 };

  listData: MatTableDataSource<any> | any;

  displayedColumns: string[] = [
    'id',
    'date_time',
    /* 'fromDayes', */
    'receiptKind',
    'receiptDetail',
    'minVal',
    'addVal',
    'balance',
    'recieptNote',
    'madeBy',
  ];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  searchTxt: string = '';

  /* searchResult: {
    onUs: number;
    toUs: number;
  } = {
    onUs: 0,
    toUs: 0,
  }; */

  searchDate: { from: string; to: string } = { from: '', to: '' };
  accArr: any[] = [];
  tempAccArry: any[] = [];

  isFiltered: boolean = false;

  headerTotals: AccHeaderTotals = new AccHeaderTotals();

  constructor(
    public _mainService: MainService,
    public activeRoute: ActivatedRoute,
    public _router: Router,
    public _glopal: GlobalVarsService,
    public _safeService: SafeService,
    public _dialog: MatDialog
  ) {
    this._glopal.loading = true;
  }

  ngOnInit(): void {
    // this._auth.returnLog();
    window.addEventListener('resize', () => {
      this._mainService.handleTableHeight();
    });

    this.id = this.activeRoute.snapshot.paramMap.get('id');

    /* array for markAndCalc */
    this.calcArr = {
      arr: [],
      total: 0,
    };

    this.onStart();
  }

  onStart() {
    this._glopal.loading = true;
    Promise.all([this.getSafe(), this.getSafeTransaction()]).then(
      (data: any[]) => {
        let result = {
          safe: data[0][0],
          safeAcc: data[1],
        };
        this._glopal.currentHeader = `???????? ???????? | ${result.safe.safeName}`;
        this.safeInfo = result.safe;
        let listData = this.makeSafeAcc(result.safeAcc);
        this.fillListData(listData);
        this._mainService.handleTableHeight();
        this._glopal.loading = false;
      }
    );
  }

  getSafe() {
    return new Promise((res) => {
      if (this.id)
        this._safeService.getSafes(this.id).subscribe((data: SafeData[]) => {
          res(data);
        });
    });
  }

  getSafeTransaction() {
    return new Promise((res) => {
      if (this.id)
        this._safeService
          .getsafeTranseAction(this.id)
          .subscribe((data: any[]) => {
            res(data);
          });
    });
  }

  makeSafeAcc(data: any[]) {
    this.accArr = [];

    let firstRow = {
      id: 1,
      receiptKind: '???????? ??????',
      receiptDetail: '',
      routeTo: '',
      minVal: this.safeInfo.opendVal < 0 ? this.safeInfo.opendVal : 0,
      addVal: this.safeInfo.opendVal >= 0 ? this.safeInfo.opendVal : 0,
      balance: this.safeInfo.opendVal,
      date_time: '',
      recieptNote: '',
      madeBy: '',
    };

    this.accArr = [...this.accArr, firstRow];

    for (let i = 0; i < data.length; i++) {
      let minVal = data[i].receiptKind.includes('?????????? ???????????? ??????????')
        ? data[i].receiptVal
        : 0;
      let addVal = data[i].receiptKind.includes('?????????? ?????? ??????????')
        ? data[i].receiptVal
        : 0;
      let balance = minVal - addVal + this.accArr[i].balance;

      const detailValues = this.setDetailValues(data[i]);

      let newData = {
        id: i + 2,
        safeReceiptId: data[i].safeReceiptId,
        receiptKind: data[i].receiptKind,
        receiptDetail: detailValues.receiptDetail,
        routeTo: detailValues.routeTo,
        toolTip: detailValues.toolTip,
        minVal: minVal,
        addVal: addVal,
        balance: balance,
        date_time: data[i].date_time.replace('T', ' '),
        recieptNote: data[i].recieptNote,
        madeBy: data[i].madeBy,
      };
      this.accArr = [...this.accArr, newData];
    }

    // this.benfordRule(this.accArr);

    return this.accArr;
  }

  setDetailValues = (
    data: any
  ): {
    receiptDetail: string;
    routeTo: string;
    toolTip: string;
  } => {
    const condArr = [
      /* customers */
      {
        toolTip: '???????? ????????',
        receiptDetail: data.customerName,
        routeTo: `/customerInformation/${data.customerId}`,
        condition: () =>
          data.customerName && data.customerName?.includes('???????? ????????'),
      },
      {
        toolTip: '???????? ??????????????',
        receiptDetail: data.customerName,
        routeTo: `/customerInformation/${data.customerId}`,
        condition: () =>
          data.customerName &&
          data.customerName?.includes('????????') &&
          !data.customerName?.includes('???????? ????????'),
      },
      {
        toolTip: '??????',
        receiptDetail: data.customerName,
        routeTo: `/customerInformation/${data.customerId}`,
        condition: () =>
          data.customerName && data.customerName?.includes('??????'),
      },
      {
        toolTip: '?????????????? ??????????????',
        receiptDetail: data.customerName,
        routeTo: `/customerInformation/${data.customerId}`,
        condition: () =>
          data.customerName && data.customerName?.includes('?????????????? ??????????????'),
      },
      {
        toolTip: '???????? | ????????????',
        receiptDetail: data.customerName,
        routeTo: `/customerInformation/${data.customerId}`,
        condition: () => data.customerName,
      },
      /* other Acc */
      {
        toolTip: '?????? ?????????? ????????????',
        receiptDetail: data.AccName,
        routeTo: `/OtherAccInformation/${data.accId}`,
        condition: () => data.AccName && data.AccName == '?????? ?????????? ????????????',
      },
      {
        toolTip: '???????????? ??????????',
        receiptDetail: data.AccName,
        routeTo: `/OtherAccInformation/${data.accId}`,
        condition: () =>
          data.AccName &&
          (data.AccName?.includes('??????????') ||
            data.AccName?.includes('??????????') ||
            data.AccName?.includes('????????') ||
            data.AccName?.includes('????????') ||
            data.AccName?.includes('????????') ||
            data.AccName?.includes('????????')),
      },
      {
        toolTip: '???????????? ????????',
        receiptDetail: data.AccName,
        routeTo: `/OtherAccInformation/${data.accId}`,
        condition: () => data.AccName && data.AccName?.includes('???????????? ????????'),
      },
      {
        toolTip: '???????????? ????????',
        receiptDetail: data.AccName,
        routeTo: `/OtherAccInformation/${data.accId}`,
        condition: () => data.AccName && data.AccName?.includes('????????'),
      },
      {
        toolTip: '?????????? ????????',
        receiptDetail: data.AccName,
        routeTo: `/OtherAccInformation/${data.accId}`,
        condition: () => data.AccName && data.AccName?.includes('?????????? ????????'),
      },
      {
        toolTip: '?????????? ?????????? ?? ??????????',
        receiptDetail: data.AccName,
        routeTo: `/OtherAccInformation/${data.accId}`,
        condition: () =>
          data.AccName && data.AccName?.includes('?????????? ?????????? ?? ??????????'),
      },
      {
        toolTip: '?????????? ??????????????????',
        receiptDetail: data.AccName,
        routeTo: `/OtherAccInformation/${data.accId}`,
        condition: () =>
          data.AccName && data.AccName?.includes('?????????? ??????????????????'),
      },
      {
        toolTip: '???????????? ??????????????',
        receiptDetail: data.AccName,
        routeTo: `/OtherAccInformation/${data.accId}`,
        condition: () => data.AccName,
      },
      /* concreteCustomer */
      {
        toolTip: '???????? ????????????',
        receiptDetail: data.concreteCustomerName,
        routeTo: `/ConcreteCustomerInformation/${data.concreteCustomer_id}`,
        condition: () => data.concreteCustomerName,
      },
      /* truck Customer */
      {
        toolTip: '???????? ??????????',
        receiptDetail: data.truckCustomerName,
        routeTo: `/TruckCustomerInformation/${data.truckCustomerId}`,
        condition: () => data.truckCustomerName,
      },
      /* trucks */
      {
        toolTip: '???????? ???? ?????????? ????????',
        receiptDetail: data.truckName,
        routeTo: `/truckLog/${data.truckId}`,
        condition: () => data.truckName,
      },
      /* worker */
      {
        toolTip: '????????',
        receiptDetail: data.workerName,
        routeTo: `/WorkerInformation/${data.workerId}`,
        condition: () => data.workerName,
      },
    ];

    const foundDetail = condArr.find((detail: any) => detail.condition());

    return {
      receiptDetail: foundDetail?.receiptDetail ?? '',
      routeTo: foundDetail?.routeTo ?? '',
      toolTip: foundDetail?.toolTip ?? '',
    };
  };

  safeInfoHeaderDetails: string = '????????';
  safeInfoHeaderDetails_hover(cond: string) {
    if (cond == 'enter') this.safeInfoHeaderDetails = '?????????? ????????';
    if (cond == 'leave') this.safeInfoHeaderDetails = '????????';
  }

  routeTo(data: any): string {
    if (data.customerName) {
      return `/customerInformation/${data.customerId}`;
    }

    if (data.AccName) {
      return `/OtherAccInformation/${data.accId}`;
    }

    if (data.truckCustomerName) {
      return `/OtherAccInformation/${data.truckCustomerId}`;
    }

    return '';
  }

  fillListData = (pureData: any, noTotal?: boolean) => {
    const data = pureData.reverse();
    this.listData = new MatTableDataSource(data);
    this.listData.sort = this.sort;
    this.listData.paginator = this.paginator;
    // this.searchResults(pureData);
    if (!noTotal) {
      this.tempAccArry = pureData;
      this.setHeaderTotals(data.reverse());
    }
  };

  search() {
    if (this.marked) this.clearCalcArr();
    this.listData.filter = this.searchTxt;
    // this.searchResults(this.tempAccArry);
  }

  openFilterDialog = (data: any) => {
    let dialogRef = this._dialog.open(FilterByDateDialogComponent, data);

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== 'cancel') {

        this.filterByDate(result.fromDate, result.toDate);
      }
    });
  };

  filterByDate(from?: string, to?: string) {
    if (from && to) {
      let start = `${from} 00:00`;
      let end = `${to} 23:59`;

      let newArr = this.accArr.filter((acc: any) => {
        return acc.date_time >= start && acc.date_time <= end;
      });
      this.isFiltered = true;

      this.searchDate = {
        from: from,
        to: to,
      };

      this.fillListData(newArr);
    } else {
      this.isFiltered = false;
      this.fillListData(this.accArr);
      this.searchDate = { from: '', to: '' };
    }
  }

  searchThisDate(date: string) {
    const spaceInd = date.indexOf(' ');
    const onlyDate = date.slice(0, spaceInd);

    this.filterByDate(onlyDate, onlyDate);
  }

  setlogoHeight() {
    const safeInfoHeader = document.querySelector(
      '#safeInfoHeader'
    ) as HTMLElement;
    const safeInfoLogo = document.querySelector('#safeInfoLogo') as HTMLElement;
    if (safeInfoHeader && safeInfoLogo)
      safeInfoLogo.style.maxHeight = `${safeInfoHeader.offsetHeight}px`;
    //this._mainService.play_sweepTransition();
  }

  setHeaderTotals(accArr: any) {
    if (accArr.length > 0) {
      this.headerTotals.openedVal =
        accArr[0].balance +
        (accArr[0].receiptKind == '???????? ??????'
          ? 0
          : accArr[0].addVal - accArr[0].minVal);

      const filteredAcc = accArr.filter(
        (acc: any) => acc.receiptKind != '???????? ??????'
      );

      this.headerTotals.income = filteredAcc
        //.map((a: any) => a.minVal)
        .reduce((a: any, b: any) => a + b.minVal, 0);

      this.headerTotals.outcome = filteredAcc
        //.map((a: any) => a.addVal)
        .reduce((a: any, b: any) => a + b.addVal, 0);
    } else {
      this.headerTotals = {
        openedVal: 0,
        income: 0,
        outcome: 0,
      };
    }

    this.set_in_out_details(accArr);

    setTimeout(() => {
      this.setlogoHeight();
    }, 50);
  }

  in_out_details: {
    details: any;
    in: number;
    out: number;
  }[] = [];

  set_in_out_details(accArr: any) {
    //this.in_out_details = [];
    let tempArr = [];
    const mainSections = [...new Set(accArr.map((sec: any) => sec.toolTip))];

    for (let i = 0; i < mainSections.length; i++) {
      if (mainSections[i]) {
        const filtered = accArr.filter(
          (acc: any) => acc.toolTip == mainSections[i]
        );

        const row = {
          details: mainSections[i],
          in: filtered.reduce((a: any, b: any) => a + b.minVal, 0),
          out: filtered.reduce((a: any, b: any) => a + b.addVal, 0),
        };

        tempArr.push(row);
        // this.in_out_details.push(row);
      }
    }

    this.in_out_details = tempArr.sort((a: any, b: any) => {
      let nameA = a.details; // ignore upper and lowercase
      let nameB = b.details; // ignore upper and lowercase
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }

      // names must be equal
      return 0;
    });
    // this.discoundsArry.sort((a, b) => a.discVal - b.discVal);
  }

  filterBySection(details: any, i?: number) {
    const inOutClass = document.querySelectorAll('.inOutClass');
    inOutClass.forEach((e: HTMLElement | any) => {
      return e.classList.remove('darkBadge');
    });

    if (details == 'all') {
      this.fillListData(this.tempAccArry);
    } else {
      const inOutId = document.getElementById(`inOutId${i}`);
      inOutId?.classList.add('darkBadge');
      const filtered = this.tempAccArry.filter(
        (acc: any) => acc.toolTip == details
      );
      this.fillListData(filtered, true);
    }
  }

  toReceipt(id: string, receiptKind: string) {
    if (receiptKind != '???????? ??????')
      this._router.navigate([`/SafeReceipt/${id}`]);
    else this._router.navigate([`/AddSafe/${this.id}`]);
  }

  printDocument() {
    window.print();
  }

  marked: boolean = false;

  markToCalc = (val: number, i: number, cell: any) => {
    const element = document.querySelector(`#${cell}${i}`) as HTMLElement;

    let cond = element.classList.contains('calcMark');

    /* cond is for marked */
    if (cond) {
      this.calcArr.arr = [...this.calcArr.arr, val * -1];
      element.style.cursor = 'grab';
      element.classList.remove('calcMark');
    } else {
      this.calcArr.arr = [...this.calcArr.arr, val];
      element.style.cursor = 'grabbing';
      element.classList.add('calcMark');
    }

    this.calcArr.total = this.calcArr.arr.reduce(
      (a: number, b: number) => a + b
    );

    if (!this.marked) this.marked = true;
  };

  clearCalcArr() {
    this.calcArr = {
      arr: [],
      total: 0,
    };

    const markVal = document.querySelectorAll('.markVal');
    markVal.forEach((e: HTMLElement | any) => e.classList.remove('calcMark'));

    this.marked = false;
  }
}
