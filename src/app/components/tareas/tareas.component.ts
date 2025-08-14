import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-tareas',
  imports: [FormsModule],
  templateUrl: './tareas.component.html',
  styleUrl: './tareas.component.css'
})
export class TareasComponent implements OnInit {

  pdfs: any[] = [];
  selectedPdfUrl: SafeResourceUrl | null = null;
  inputPdfUrl= '';


  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    this.loadPdfs();
  }

  loadPdfs(): void {
    // Lista de archivos PDF en la carpeta public/archives/
    this.pdfs = [
      {id:1, name:'VIGENTE - REV1 - C8309 - ARNES LUCES DE TRASLADO GEOSPOT.pdf'}
    ];
  }

  selectPdf(pdfName: string): void {
    const url = `archives/${pdfName}`;
    this.selectedPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl("https://drive.google.com/file/d/1AggRe3Y8IZxdamRFlStW4YRqfgi4t73y/view?usp=drive_link");

  }
    
  openPdfFromInput(): void {
    debugger
    if (this.inputPdfUrl) {
      this.selectedPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.inputPdfUrl);
    }
  }
}
