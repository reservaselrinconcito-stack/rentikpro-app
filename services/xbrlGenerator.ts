
import { FiscalProfile, RegistryUnit, Booking } from '../types';

/**
 * Genera el contenido XML (XBRL Simplificado para el ejemplo) 
 * correspondiente al Modelo Informativo Anual de Arrendamientos.
 * Se basa en la Orden VAU/1560/2025.
 */

interface XBRLContext {
  year: number;
  fiscal: FiscalProfile;
  units: RegistryUnit[];
  bookings: Booking[];
}

export const generateAnnualXBRL = (ctx: XBRLContext): string => {
  const { year, fiscal, units, bookings } = ctx;
  const now = new Date().toISOString();

  // Encabezado del reporte
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<xbrl xmlns="http://www.xbrl.org/2003/instance" xmlns:vuda="http://www.registradores.org/vuda/2025">
  <!-- Datos del Declarante -->
  <context id="Ctx_${year}">
    <entity>
      <identifier scheme="http://www.aeat.es/nif">${fiscal.nif_cif}</identifier>
      <segment>
        <vuda:Declarante>
          <vuda:NombreRazon>${fiscal.nombre_razon_social}</vuda:NombreRazon>
          <vuda:Domicilio>${fiscal.domicilio_fiscal}, ${fiscal.provincia}</vuda:Domicilio>
          <vuda:Telefono>${fiscal.telefono}</vuda:Telefono>
          <vuda:Email>${fiscal.email}</vuda:Email>
        </vuda:Declarante>
      </segment>
    </entity>
    <period>
      <startDate>${year}-01-01</startDate>
      <endDate>${year}-12-31</endDate>
    </period>
  </context>
  
  <!-- Informe -->
  <vuda:InformeAnual>
    <vuda:Ejercicio>${year}</vuda:Ejercicio>
    <vuda:FechaGeneracion>${now}</vuda:FechaGeneracion>
`;

  // Iterar por Unidades Registrales
  units.forEach(u => {
    // Filtrar reservas para esta unidad en el año
    const unitBookings = bookings.filter(b => 
      b.apartment_id === u.apartment_id && 
      b.check_in.startsWith(year.toString()) && 
      b.status === 'confirmed'
    );

    if (unitBookings.length === 0) return; // Si no hay actividad, ¿reportar? Depende ley. Asumimos no.

    const totalIngresos = unitBookings.reduce((sum, b) => sum + b.total_price, 0);
    const diasOcupacion = unitBookings.reduce((sum, b) => {
        const start = new Date(b.check_in);
        const end = new Date(b.check_out);
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
        return sum + diff;
    }, 0);

    xml += `
    <vuda:UnidadRegistral id="${u.id}">
      <vuda:IdentificadorRegistral>${u.identificador_registral || 'PENDIENTE'}</vuda:IdentificadorRegistral>
      <vuda:ReferenciaCatastral>${u.referencia_catastral}</vuda:ReferenciaCatastral>
      <vuda:Direccion>${u.direccion_completa}, ${u.municipio} (${u.codigo_postal})</vuda:Direccion>
      <vuda:Licencia>${u.licencia_turistica}</vuda:Licencia>
      
      <vuda:ResumenActividad>
         <vuda:DiasOcupacion>${diasOcupacion}</vuda:DiasOcupacion>
         <vuda:NumOperaciones>${unitBookings.length}</vuda:NumOperaciones>
         <vuda:ImporteTotal>${totalIngresos.toFixed(2)}</vuda:ImporteTotal>
      </vuda:ResumenActividad>

      <vuda:DetalleOperaciones>
`;
      // Detalle de cada reserva
      unitBookings.forEach(b => {
         xml += `        <vuda:Operacion id="${b.id}">
           <vuda:FechaInicio>${b.check_in}</vuda:FechaInicio>
           <vuda:FechaFin>${b.check_out}</vuda:FechaFin>
           <vuda:Importe>${b.total_price.toFixed(2)}</vuda:Importe>
           <vuda:HuespedRef>${b.traveler_id}</vuda:HuespedRef> <!-- En real, incluiría datos anonimizados o NIF -->
        </vuda:Operacion>
`;
      });

    xml += `      </vuda:DetalleOperaciones>
    </vuda:UnidadRegistral>
`;
  });

  xml += `  </vuda:InformeAnual>
</xbrl>`;

  return xml;
};
