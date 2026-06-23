import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-icon-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-th-large" [style.font-size.px]="width"></i>`,
})
export class IconDashboardComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-systems',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-server" [style.font-size.px]="width"></i>`,
})
export class IconSystemsComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-roles',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-shield" [style.font-size.px]="width"></i>`,
})
export class IconRolesComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-users',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-users" [style.font-size.px]="width"></i>`,
})
export class IconUsersComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-authorizer',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-check-square" [style.font-size.px]="width"></i>`,
})
export class IconAuthorizerComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-access',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-key" [style.font-size.px]="width"></i>`,
})
export class IconAccessComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-audit',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-file" [style.font-size.px]="width"></i>`,
})
export class IconAuditComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-key',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-lock" [style.font-size.px]="width"></i>`,
})
export class IconKeyComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-plus',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-plus" [style.font-size.px]="width"></i>`,
})
export class IconPlusComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-search',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-search" [style.font-size.px]="width"></i>`,
})
export class IconSearchComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-edit',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-pencil" [style.font-size.px]="width"></i>`,
})
export class IconEditComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-trash',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-trash" [style.font-size.px]="width"></i>`,
})
export class IconTrashComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-close',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-times" [style.font-size.px]="width"></i>`,
})
export class IconCloseComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-check',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-check" [style.font-size.px]="width"></i>`,
})
export class IconCheckComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-logout',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-sign-out" [style.font-size.px]="width"></i>`,
})
export class IconLogoutComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-shield',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-shield" [style.font-size.px]="width"></i>`,
})
export class IconShieldComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-server',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-server" [style.font-size.px]="width"></i>`,
})
export class IconServerComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-clock',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-clock" [style.font-size.px]="width"></i>`,
})
export class IconClockComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-ldap',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-database" [style.font-size.px]="width"></i>`,
})
export class IconLdapComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-user-plus',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-user-plus" [style.font-size.px]="width"></i>`,
})
export class IconUserPlusComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-building',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-building" [style.font-size.px]="width"></i>`,
})
export class IconBuildingComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-chevron-right',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-chevron-right" [style.font-size.px]="width"></i>`,
})
export class IconChevronRightComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-alert',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-exclamation-triangle" [style.font-size.px]="width"></i>`,
})
export class IconAlertComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-info',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-info-circle" [style.font-size.px]="width"></i>`,
})
export class IconInfoComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-lock',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-lock" [style.font-size.px]="width"></i>`,
})
export class IconLockComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-user',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-user" [style.font-size.px]="width"></i>`,
})
export class IconUserComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-refresh',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-refresh" [style.font-size.px]="width"></i>`,
})
export class IconRefreshComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-download',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-download" [style.font-size.px]="width"></i>`,
})
export class IconDownloadComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-layers',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-table" [style.font-size.px]="width"></i>`,
})
export class IconLayersComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-security',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-lock" [style.font-size.px]="width"></i>`,
})
export class IconSecurityComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-trend-up',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-arrow-up" [style.font-size.px]="width"></i>`,
})
export class IconTrendUpComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-matrix',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-table" [style.font-size.px]="width"></i>`,
})
export class IconMatrixComponent {
  @Input() width = 16;
  @Input() height = 16;
}

@Component({
  selector: 'app-icon-upload',
  standalone: true,
  imports: [CommonModule],
  template: `<i class="pi pi-upload" [style.font-size.px]="width"></i>`,
})
export class IconUploadComponent {
  @Input() width = 16;
  @Input() height = 16;
}

export const ICONS = [
  IconDashboardComponent,
  IconSystemsComponent,
  IconRolesComponent,
  IconUsersComponent,
  IconAuthorizerComponent,
  IconAccessComponent,
  IconAuditComponent,
  IconKeyComponent,
  IconPlusComponent,
  IconSearchComponent,
  IconEditComponent,
  IconTrashComponent,
  IconCloseComponent,
  IconCheckComponent,
  IconLogoutComponent,
  IconShieldComponent,
  IconServerComponent,
  IconClockComponent,
  IconLdapComponent,
  IconUserPlusComponent,
  IconBuildingComponent,
  IconChevronRightComponent,
  IconAlertComponent,
  IconInfoComponent,
  IconLockComponent,
  IconUserComponent,
  IconRefreshComponent,
  IconDownloadComponent,
  IconLayersComponent,
  IconTrendUpComponent,
  IconSecurityComponent,
  IconMatrixComponent,
  IconUploadComponent,
];
