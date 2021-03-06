import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { NgForm } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeWorkedDayes } from 'src/app/classes/employee-worked-dayes';
import { SafeReceipt } from 'src/app/classes/safe-receipt';
import { AddDiscoundDialogComponent } from 'src/app/dialogs/add-discound-dialog/add-discound-dialog.component';
import { AuthService } from 'src/app/services/auth.service';
import { GlobalVarsService } from 'src/app/services/global-vars.service';
import { MainService } from 'src/app/services/main.service';
import { SafeService } from 'src/app/services/safe.service';
import { WorkerService } from 'src/app/services/worker.service';
import { Worker } from '../../classes/worker';
import { DeleteDialogComponent } from 'src/app/dialogs/delete-dialog/delete-dialog.component';
import { FilterByDateDialogComponent } from 'src/app/dialogs/filter-by-date-dialog/filter-by-date-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-worker-information',
  templateUrl: './worker-information.component.html',
  styleUrls: ['./worker-information.component.scss'],
})
export class WorkerInformationComponent implements OnInit {
  worker: Worker = new Worker();
  id!: string | null;

  listData: MatTableDataSource<any> | any;

  /*
  id: i + 1,
  receiptKind: acc.receiptKind,
  minVal: minVal,
  addVal: addVal,
  balance: balance,
  date_time: acc.date_time,
  notes: acc.notes,
  */

  displayedColumns: string[] = [
    'id',
    'date_time',
    'receiptKind',
    'minVal',
    'addVal',
    'balance',
    'notes',
  ];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  searchTxt: string = '';
  searchDate: { from: string; to: string } = { from: '', to: '' };
  isFiltered: boolean = false;

  showCalcSalary: boolean = false;
  workedDayes: EmployeeWorkedDayes = new EmployeeWorkedDayes();
  accArr: any[] = [];
  tempAccArry: any[] = [];

  marked: boolean = false;
  calcArr: {
    arr: number[];
    total: number;
  } = { arr: [], total: 0 };

  constructor(
    public _workerService: WorkerService,
    public _mainService: MainService,
    public activeRoute: ActivatedRoute,
    public _dialog: MatDialog,
    public _router: Router,
    public _safeService: SafeService,
    public _glopal: GlobalVarsService,
    public _snackBar: MatSnackBar,
    public _auth: AuthService
  ) {
    this._glopal.currentHeader = '?????????????? ?????????? ??????????';
    this._glopal.loading = true;
  }

  ngOnInit(): void {
    this.id = this.activeRoute.snapshot.paramMap.get('id');
    window.addEventListener('resize', () => {
      this._mainService.handleTableHeight();
    });
    this.onStart();
  }

  onStart() {
    this.showCalcSalary = false;
    Promise.all([this.getWorkersPromise(), this.getWorkerAcc()]).then(
      (data: any) => {
        const result = {
          worker: data[0][0],
          acc: data[1],
        };
        this.worker = result.worker;

        const accToFill = this.makeWorkerAcc(result.acc);
        this.fillListData(accToFill);

        this._mainService.handleTableHeight();
        // this.accArr = result.acc;
        this._glopal.loading = false;
      }
    );
  }

  makeWorkerAcc(workerAcc: any[]) {
    this.accArr = [];

    for (let i = 0; i < workerAcc.length; i++) {
      const acc = workerAcc[i];

      const minVal =
        acc.receiptKind.includes('?????????? ???????????? ??????????') ||
        acc.receiptKind.includes('???????? ??????????')
          ? acc.receiptVal
          : 0;

      const addVal = acc.receiptKind.includes('?????????? ?????? ??????????')
        ? acc.receiptVal
        : 0;

      const brevTotal = i > 0 ? this.accArr[i - 1].balance : 0;

      const balance = addVal - minVal + brevTotal;

      const row = {
        id: i + 1,
        safeReceiptId: acc.safeReceiptId,
        receiptKind: acc.receiptKind,
        minVal: minVal,
        addVal: addVal,
        balance: balance,
        date_time: acc.date_time,
        notes: acc.notes,
      };

      this.accArr = [...this.accArr, row];
    }

    return this.accArr;
  }

  getWorkerAcc() {
    return new Promise((res) => {
      if (this.id)
        this._workerService
          .workerAcc(this.id)
          .subscribe((data: any[]) => res(data));
    });
  }

  getWorkersPromise() {
    return new Promise((res) => {
      if (this.id)
        this._workerService
          .getWorker(this.id)
          .subscribe((data: Worker[]) => res(data));
    });
  }

  fillListData = (pureData: any) => {
    const data = pureData.reverse();
    this.listData = new MatTableDataSource(data);
    this.listData.sort = this.sort;
    this.listData.paginator = this.paginator;
    // this.searchResults(pureData);
    this.tempAccArry = pureData;
  };

  search() {
    if (this.marked) this.clearCalcArr();
    this.listData.filter = this.searchTxt;
    // this.searchResults(this.tempAccArry);
  }

  printDocument() {
    window.print();
  }

  clearCalcArr() {
    this.calcArr = {
      arr: [],
      total: 0,
    };

    const markVal = document.querySelectorAll('.markVal');
    markVal.forEach((e: HTMLElement | any) => {
      return e.classList.remove('calcMark');
    });

    this.marked = false;
  }

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

  openDiscoundDialog = (data: SafeReceipt) => {
    let dialogRef = this._dialog.open(AddDiscoundDialogComponent, {
      data: data,
    });

    dialogRef.afterClosed().subscribe((result: SafeReceipt) => {
      if (result) {
        const safeReceipt = this.receiptForDiscound(result);
        this._safeService.creatSafeReceipt(safeReceipt).subscribe(() => {
          this._mainService.playMouseClickClose();
          this.onStart();
        });
      }
    });
  };

  calcRemainSalary(addSalaryForm?: NgForm, calcFor?: string) {
    const daySalary = this.worker.workerSalary / 30;
    const netDaysWorks =
      this.workedDayes.workedDayes + this.workedDayes.overDayes;

    this.workedDayes.remainSalary =
      netDaysWorks * daySalary - this.workedDayes.discoundDayes;

    if (addSalaryForm && calcFor) {
      this.check_workedDayes_Valid(addSalaryForm, calcFor);
    }
  }

  workedDaysValid: boolean = false;

  check_workedDayes_Valid(addSalaryForm: NgForm, calcFor: string) {
    if (this.workedDayes.workedDayes > 30 && calcFor == 'workedDayes') {
      addSalaryForm.form.controls[`workedDayes`].setErrors({
        incorrect: true,
      });
      this._mainService.playshortFail();
    } else if (this.workedDayes.overDayes > 30 && calcFor == 'overDayes') {
      addSalaryForm.form.controls[`overDayes`].setErrors({
        incorrect: true,
      });
      this._mainService.playshortFail();
    } else {
      addSalaryForm.form.controls[`${calcFor}`].setErrors(null);
    }
  }

  receiptForDiscound(result: SafeReceipt): SafeReceipt {
    const safeReceipt = new SafeReceipt();

    safeReceipt.workerId = this.worker.workerId.toString();
    safeReceipt.workerName = this.worker.workerName;
    safeReceipt.receiptVal = result.receiptVal;
    safeReceipt.recieptNote = result.recieptNote;
    safeReceipt.date_time = result.date_time;
    safeReceipt.safeId = result.safeId;
    safeReceipt.receiptKind = result.receiptKind;
    safeReceipt.safeName = result.safeName;
    safeReceipt.transactionAccKind = '????????????';
    safeReceipt.madeBy = this._auth.uName.realName;

    return safeReceipt;
  }

  startCalcSalary() {
    this.workedDayes = new EmployeeWorkedDayes();
    this.workedDayes.workerId = this.worker.workerId.toString();
    this.workedDayes.date_time = this._mainService.makeTime_date(
      new Date(Date.now())
    );
    this.showCalcSalary = true;
  }

  /* main discound button */
  addDiscound() {
    const safeReceipt = new SafeReceipt();
    safeReceipt.workerId = this.worker.workerId.toString();
    safeReceipt.workerName = this.worker.workerName;
    safeReceipt.receiptKind = '?????????? ?????? ??????????';
    safeReceipt.recieptNote = ``;
    safeReceipt.date_time = this._mainService.makeTime_date(
      new Date(Date.now())
    );
    this.openDiscoundDialog(safeReceipt);
  }

  recordWorkedDayes() {
    this._glopal.loading = true;
    if (this.workedDayes.id) {
      /* if (
        this._mainService.dateExpired(
          this.workedDayes.date_time.replace(' ', 'T')
        )
      ) {
        this._workerService
          .updateEmployeeWorkedDayes(this.workedDayes)
          .subscribe(() => this.onStart());
        this._mainService.playMouseClickClose();
      } else {
        this._snackBar.open('?????????? ???????????? ??????????????', '??????????', {
          duration: 2500,
        });
        this._mainService.playDrumFail();
        this.showCalcSalary = false;
      } */

      this._workerService
        .updateEmployeeWorkedDayes(this.workedDayes)
        .subscribe(() => this.onStart());
      this._mainService.playMouseClickClose();
    } else {
      this._workerService
        .postEmployeeWorkedDayes(this.workedDayes)
        .subscribe(() => this.onStart());
      this._mainService.playMouseClickClose();
    }
  }

  submitSalary(addSalaryForm: NgForm) {
    if (addSalaryForm.valid) this.recordWorkedDayes();
    else this._mainService.playshortFail();
  }

  handleRout(detail: string, id: string) {
    if (detail.includes('???????? ??????????')) {
      this._glopal.loading = true;
      this._workerService
        .getEmployeeWorkedDays(id)
        .subscribe((data: EmployeeWorkedDayes[]) => {
          this.workedDayes = data[0];
          this.showCalcSalary = true;
          this._glopal.loading = false;
        });
    } else {
      this._router.navigate([`/SafeReceipt/${id}`]);
    }
  }

  openDelDialog = () => {
    if (
      this._mainService.dateExpired(
        this.workedDayes.date_time.replace(' ', 'T')
      )
    ) {
      let dialogRef = this._dialog.open(DeleteDialogComponent, {
        data: {
          header: '?????????? ???????????? ???? ???????????? ???????????? ?????? ?????????? !',
          info: `???????? ?????????? | ${this.workedDayes.workedDayes}`,
          discription: [
            `?????? ???????? | ${this.workedDayes.discoundDayes}`,
            `???????? ?????????? | ${this.workedDayes.overDayes}`,
            `?????????????? | ${this.workedDayes.remainSalary} ????????`,
          ],
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result == 'true') {
          {
            if (this.workedDayes.id)
              this._workerService
                .deleteEmployeeWorkedDayes(this.workedDayes.id)
                .subscribe(() => this.onStart());
          }
        }
      });
    } else {
      this._snackBar.open('?????????? ???????????? ??????????', '??????????', {
        duration: 2500,
      });
      this._mainService.playDrumFail();
      this.showCalcSalary = false;
    }
  };

  openFilterDialog = (data: any) => {
    let dialogRef = this._dialog.open(FilterByDateDialogComponent, data);

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== 'cancel') {
        this.searchDate = {
          from: result.fromDate,
          to: result.toDate,
        };
        this.filterByDate(result.fromDate, result.toDate);
      }
    });
  };

  filterByDate(from?: string, to?: string) {
    if (from && to) {
      let start = `${from} 00:00`;
      let end = `${to} 23:59`;

      let newArr = this.accArr
        .filter((acc) => {
          return acc.date_time >= start && acc.date_time <= end;
        })
        .reverse();

      this.isFiltered = true;
      this.fillListData(newArr);

      this.isFiltered = true;

      this.searchDate = { from: from, to: to };
    } else {
      this.searchDate = { from: '', to: '' };
      this.searchTxt = '';
      this.onStart();
      this.isFiltered = false;
    }
  }
}
