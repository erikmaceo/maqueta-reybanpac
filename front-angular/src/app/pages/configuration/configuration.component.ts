import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

// Este componente queda como reserva de compatibilidad. La ruta /configuracion
// redirige a /niveles-segregacion en app.routes.ts.
@Component({
  selector: 'app-configuration',
  standalone: true,
  template: ``,
})
export class ConfigurationComponent implements OnInit {
  private router = inject(Router);

  ngOnInit(): void {
    this.router.navigate(['/niveles-segregacion']);
  }
}
