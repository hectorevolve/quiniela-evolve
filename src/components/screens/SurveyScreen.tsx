'use client';
/**
 * SurveyScreen — Encuesta de Clima Laboral 2026
 * Gate obligatorio: se muestra la primera vez que el usuario entra a la app.
 * Las respuestas se envían anónimas a /api/survey/submit.
 * Al completar llama a onDone() para avanzar a la quiniela.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface ScaleDef { min: number; max: number; minLabel: string; maxLabel: string }
interface Option    { value: string; label: string }
interface Question  {
  id: string; type: 'single_choice'|'likert_1_5'|'scale_0_10'|'long_text';
  required: boolean; label: string; sensitive?: boolean; maxLength?: number;
  placeholder?: string; metric?: string;
  options?: Option[]; scale?: ScaleDef;
  condition?: { dependsOn: string; equals: string };
}
interface Section   { id: string; title: string; questions: Question[] }
type Answers        = Record<string, string|number>;

// ─── Configuración de la encuesta ────────────────────────────────────────────
const DEFAULT_SCALE: ScaleDef = { min:1, max:5, minLabel:'Totalmente desacuerdo', maxLabel:'Totalmente de acuerdo' };

// ─── Encuesta Evolve (empleados internos) ─────────────────────────────────────
const ENCUESTA_EVOLVE = {
  id: 'encuesta-clima-cultura-evolve-2026',
  version: '1.0.0',
  storageKey: 'evolve-clima-cultura-v1',
  sections: [
    {
      id: 'contexto', title: 'Contexto',
      questions: [
        { id:'area', type:'single_choice', required:true, label:'¿En qué área trabajas?',
          options:[{value:'operaciones',label:'Operaciones'},{value:'comercial_ventas',label:'Comercial / Ventas'},{value:'tecnologia_sistemas',label:'Tecnología / Sistemas'},{value:'capital_humano',label:'Capital Humano'},{value:'finanzas_admin',label:'Finanzas / Administración'},{value:'marketing_loyalty',label:'Marketing / Loyalty'},{value:'otra',label:'Otra'}] },
        { id:'nivel', type:'single_choice', required:true, label:'¿Cuál es tu nivel jerárquico?',
          options:[{value:'operativo_analista',label:'Operativo / Analista'},{value:'coordinador_especialista',label:'Coordinador / Especialista'},{value:'gerencia',label:'Gerencia'},{value:'direccion',label:'Dirección'}] },
        { id:'antiguedad', type:'single_choice', required:true, label:'¿Cuánto tiempo llevas en Evolve?',
          options:[{value:'menos_6_meses',label:'Menos de 6 meses'},{value:'6m_1a',label:'6 meses a 1 año'},{value:'1_3_anos',label:'1 a 3 años'},{value:'3_5_anos',label:'3 a 5 años'},{value:'mas_5_anos',label:'Más de 5 años'}] },
      ]
    },
    {
      id: 'apego_cultural', title: 'Apego cultural',
      questions: [
        { id:'q4_identificacion_valores', type:'likert_1_5', required:true, label:'Me identifico con los valores y la cultura de Evolve.', scale:DEFAULT_SCALE },
        { id:'q5_valores_vividos', type:'likert_1_5', required:true, label:'Los valores de Evolve se viven en el día a día, no son solo discurso.', scale:DEFAULT_SCALE },
      ]
    },
    {
      id: 'ambiente_bienestar', title: 'Ambiente y bienestar',
      questions: [
        { id:'q24_a_gusto', type:'likert_1_5', required:true, label:'Estoy a gusto en mi trabajo en Evolve.', scale:DEFAULT_SCALE },
        { id:'q25_ambiente_positivo', type:'likert_1_5', required:true, label:'El ambiente de trabajo en mi área es positivo y respetuoso.', scale:DEFAULT_SCALE },
        { id:'q26_viene_contento', type:'likert_1_5', required:true, label:'La mayoría de los días vengo contento(a) a trabajar.', scale:DEFAULT_SCALE },
        { id:'q27_companeros', type:'likert_1_5', required:true, label:'Tengo buena relación con mis compañeros de trabajo.', scale:DEFAULT_SCALE },
      ]
    },
    {
      id: 'lider_directo', title: 'Tu líder directo',
      questions: [
        { id:'q6_lider_feedback', type:'likert_1_5', required:true, label:'Mi líder directo me da retroalimentación clara y oportuna sobre mi trabajo.', scale:DEFAULT_SCALE },
        { id:'q7_lider_autonomia', type:'likert_1_5', required:true, label:'Mi líder directo me da la autonomía necesaria para hacer bien mi trabajo.', scale:DEFAULT_SCALE },
        { id:'q8_lider_reconocimiento', type:'likert_1_5', required:true, label:'Mi líder directo reconoce mis logros y aportes.', scale:DEFAULT_SCALE },
      ]
    },
    {
      id: 'liderazgo_directivo', title: 'Liderazgo directivo',
      questions: [
        { id:'q9_direccion_comunicacion', type:'likert_1_5', required:true, label:'La dirección de Evolve comunica claramente hacia dónde va la empresa.', scale:DEFAULT_SCALE },
        { id:'q10_direccion_confianza', type:'likert_1_5', required:true, label:'Confío en las decisiones que toma la dirección de Evolve.', scale:DEFAULT_SCALE },
      ]
    },
    {
      id: 'claridad_desarrollo', title: 'Claridad y desarrollo',
      questions: [
        { id:'q11_expectativas_claras', type:'likert_1_5', required:true, label:'Sé claramente qué se espera de mí en mi puesto.', scale:DEFAULT_SCALE },
        { id:'q12_medicion_desempeno', type:'likert_1_5', required:true, label:'Sé cómo se mide mi desempeño.', scale:DEFAULT_SCALE },
        { id:'q13_ruta_crecimiento', type:'likert_1_5', required:true, label:'Veo una ruta de crecimiento clara para mí en Evolve.', scale:DEFAULT_SCALE },
      ]
    },
    {
      id: 'compensacion', title: 'Compensación y reconocimiento',
      questions: [
        { id:'q14_compensacion_justa', type:'likert_1_5', required:true, label:'Considero que mi compensación es justa para el rol que desempeño.', scale:DEFAULT_SCALE },
        { id:'q15_reconocimiento_no_salarial', type:'likert_1_5', required:true, label:'En Evolve se reconoce el buen trabajo más allá del salario (gestos, oportunidades, visibilidad).', scale:DEFAULT_SCALE },
      ]
    },
    {
      id: 'balance', title: 'Balance vida-trabajo',
      questions: [
        { id:'q16_carga_manejable', type:'likert_1_5', required:true, label:'Mi carga de trabajo es manejable dentro de mi horario laboral.', scale:{min:1,max:5,minLabel:'Nunca',maxLabel:'Siempre'} },
        { id:'q17_desconexion', type:'likert_1_5', required:true, label:'Puedo desconectarme de Evolve fuera del horario sin sentir presión.', scale:{min:1,max:5,minLabel:'Nunca',maxLabel:'Siempre'} },
      ]
    },
    {
      id: 'colaboracion', title: 'Colaboración y herramientas',
      questions: [
        { id:'q18_colaboracion_areas', type:'likert_1_5', required:true, label:'Las áreas con las que más colaboro lo hacen bien conmigo.', scale:DEFAULT_SCALE },
        { id:'q19_herramientas_adecuadas', type:'likert_1_5', required:true, label:'Tengo las herramientas (tecnología, accesos, recursos) que necesito para hacer bien mi trabajo.', scale:DEFAULT_SCALE },
      ]
    },
    {
      id: 'cierre', title: 'Última sección',
      questions: [
        { id:'q20_enps', type:'scale_0_10', required:true, metric:'enps', label:'En una escala del 0 al 10, ¿qué tan probable es que recomiendes Evolve como un buen lugar de trabajo a un amigo o familiar?', scale:{min:0,max:10,minLabel:'Nada probable',maxLabel:'Totalmente probable'} },
        { id:'q21_lo_que_gusta', type:'long_text', required:false, maxLength:500, label:'¿Qué es lo que más te gusta de trabajar en Evolve?', placeholder:'Cuéntanos lo que valoras...' },
        { id:'q22_cambios_mejoras', type:'long_text', required:false, maxLength:500, label:'¿Qué cambiarías o mejorarías en Evolve si pudieras?', placeholder:'Sé honesto, queremos saber...' },
        { id:'q23_mensaje_directivos', type:'long_text', required:false, maxLength:500, label:'¿Hay algo más que quieras compartir con el equipo directivo?', placeholder:'Es opcional, pero todo cuenta...' },
      ]
    },
  ] as Section[],
};

// ─── Encuesta Promotores (todos los demás grupos) ─────────────────────────────
const ENCUESTA_PROMOTORES = {
  id: 'encuesta-clima-evolve-promotores-2026',
  version: '1.0.0',
  storageKey: 'evolve-encuesta-promotores-v1',
  sections: [
    {
      id: 'datos-segmentacion', title: 'Cuéntanos de ti',
      questions: [
        { id:'region', type:'single_choice', required:true, label:'¿En qué zona o región operas?',
          options:[{value:'cdmx',label:'CDMX y Área Metropolitana'},{value:'bajio',label:'Bajío'},{value:'occidente',label:'Occidente'},{value:'norte',label:'Norte'},{value:'noreste',label:'Noreste'},{value:'sureste',label:'Sureste'},{value:'peninsula',label:'Península'}] },
        { id:'antiguedad', type:'single_choice', required:true, label:'¿Cuánto tiempo llevas trabajando en Evolve?',
          options:[{value:'menos_3m',label:'Menos de 3 meses'},{value:'3_6m',label:'Entre 3 y 6 meses'},{value:'6m_1a',label:'Entre 6 meses y 1 año'},{value:'1_2a',label:'Entre 1 y 2 años'},{value:'mas_2a',label:'Más de 2 años'}] },
      ]
    },
    {
      id: 'satisfaccion', title: 'Tu experiencia en Evolve',
      questions: [
        { id:'satisfaccion_general', type:'likert_1_5', required:true, label:'En general, ¿qué tan satisfecho(a) estás trabajando en Evolve?', scale:{min:1,max:5,minLabel:'Muy insatisfecho',maxLabel:'Muy satisfecho'} },
        { id:'enps', type:'scale_0_10', required:true, metric:'enps', label:'¿Qué tan probable es que recomiendes a un amigo o familiar trabajar en Evolve?', scale:{min:0,max:10,minLabel:'Nada probable',maxLabel:'Totalmente'} },
        { id:'razon_recomendacion', type:'long_text', required:false, maxLength:500, label:'¿Cuál es la principal razón de la calificación que diste arriba?', placeholder:'Cuéntanos en pocas palabras...' },
        { id:'cambio_uno', type:'long_text', required:true, maxLength:500, label:'Si pudieras cambiar UNA SOLA cosa de tu experiencia trabajando en Evolve, ¿qué sería?', placeholder:'Una cosa, la que más impacto tendría para ti...' },
      ]
    },
    {
      id: 'dia_a_dia', title: 'Tu día a día en ruta',
      questions: [
        { id:'claridad_objetivos', type:'likert_1_5', required:true, label:'¿Qué tan claras son las indicaciones y objetivos que recibes para tu jornada?', scale:{min:1,max:5,minLabel:'Nada claras',maxLabel:'Totalmente claras'} },
        { id:'herramientas_materiales', type:'likert_1_5', required:true, label:'¿Cuentas con las herramientas y materiales para hacer bien tu trabajo en piso? (uniforme, material POP, app, equipo)', scale:{min:1,max:5,minLabel:'Nunca',maxLabel:'Siempre'} },
        { id:'trato_personal_tienda', type:'likert_1_5', required:true, label:'¿Qué tan respetuoso y profesional es el trato que recibes de los asociados y jefes de piso en las tiendas?', scale:{min:1,max:5,minLabel:'Muy malo',maxLabel:'Excelente'} },
        { id:'seguridad_traslados', type:'likert_1_5', required:true, label:'¿Qué tan seguro(a) te sientes durante tus traslados entre tiendas?', scale:{min:1,max:5,minLabel:'Muy inseguro',maxLabel:'Totalmente seguro'} },
        { id:'mayor_reto_ruta', type:'long_text', required:true, maxLength:500, label:'¿Cuál es el mayor reto que enfrentas en tu día a día en ruta?', placeholder:'Lo que más se te complica...' },
        { id:'incidente_acoso', type:'single_choice', required:true, sensitive:true, label:'¿Has vivido alguna situación de falta de respeto, acoso o trato injusto por parte del personal de las tiendas?',
          options:[{value:'si',label:'Sí'},{value:'no',label:'No'},{value:'prefiero_no_decir',label:'Prefiero no decirlo'}] },
        { id:'respaldo_evolve', type:'single_choice', required:false, sensitive:true, label:'¿Sentiste que Evolve te respaldó cuando viviste esa situación?',
          condition:{dependsOn:'incidente_acoso',equals:'si'},
          options:[{value:'si',label:'Sí, totalmente'},{value:'parcialmente',label:'Parcialmente'},{value:'no',label:'No'}] },
      ]
    },
    {
      id: 'supervisor', title: 'Tu supervisor o coordinador',
      questions: [
        { id:'supervisor_accesible', type:'likert_1_5', required:true, label:'¿Qué tan accesible está tu supervisor(a) cuando lo(a) necesitas?', scale:{min:1,max:5,minLabel:'Nunca accesible',maxLabel:'Siempre accesible'} },
        { id:'supervisor_retroalimentacion', type:'likert_1_5', required:true, label:'La retroalimentación que te da tu supervisor(a), ¿te ayuda a mejorar tu trabajo?', scale:{min:1,max:5,minLabel:'Nunca me ayuda',maxLabel:'Siempre me ayuda'} },
        { id:'supervisor_reconocimiento', type:'likert_1_5', required:true, label:'¿Tu supervisor(a) reconoce tu esfuerzo cuando haces bien las cosas?', scale:{min:1,max:5,minLabel:'Nunca',maxLabel:'Siempre'} },
        { id:'supervisor_confianza', type:'likert_1_5', required:true, label:'¿Sientes que puedes hablar con tu supervisor(a) si tienes un problema personal o laboral?', scale:{min:1,max:5,minLabel:'No, nunca',maxLabel:'Con total confianza'} },
        { id:'supervisor_mejora', type:'long_text', required:false, maxLength:500, label:'¿Qué podría hacer tu supervisor(a) para apoyarte mejor?', placeholder:'Opcional...' },
      ]
    },
    {
      id: 'ejecutivo_rh', title: 'Ejecutivo de cuenta y Recursos Humanos',
      questions: [
        { id:'ejecutivo_respuesta', type:'likert_1_5', required:true, label:'¿Qué tan rápido te responde tu ejecutivo de cuenta cuando le reportas algo?', scale:{min:1,max:5,minLabel:'Nunca a tiempo',maxLabel:'Siempre rápido'} },
        { id:'ejecutivo_resolucion', type:'likert_1_5', required:true, label:'Cuando tienes un problema operativo, ¿qué tan bien lo resuelve tu ejecutivo de cuenta?', scale:{min:1,max:5,minLabel:'No lo resuelve',maxLabel:'Lo resuelve total'} },
        { id:'ejecutivo_entiende_campo', type:'likert_1_5', required:true, label:'¿Sientes que tu ejecutivo de cuenta entiende los retos que vives en piso?', scale:{min:1,max:5,minLabel:'No entiende',maxLabel:'Entiende total'} },
        { id:'rh_satisfaccion', type:'likert_1_5', required:true, label:'¿Qué tan satisfecho(a) estás con la atención que recibes de Recursos Humanos?', scale:{min:1,max:5,minLabel:'Muy insatisfecho',maxLabel:'Muy satisfecho'} },
        { id:'rh_tiempos', type:'likert_1_5', required:true, label:'Cuando tienes un trámite o duda con RH, ¿te resuelven en tiempo razonable?', scale:{min:1,max:5,minLabel:'Nunca a tiempo',maxLabel:'Siempre a tiempo'} },
        { id:'ejecutivo_rh_mejora', type:'long_text', required:false, maxLength:500, label:'¿Hay algo específico que el ejecutivo de cuenta o RH podrían mejorar para apoyarte mejor?', placeholder:'Opcional...' },
      ]
    },
    {
      id: 'emetrix', title: 'Emetrix y soporte técnico',
      questions: [
        { id:'emetrix_facilidad', type:'likert_1_5', required:true, label:'¿Qué tan fácil es usar Emetrix para reportar tus actividades?', scale:{min:1,max:5,minLabel:'Muy difícil',maxLabel:'Muy fácil'} },
        { id:'emetrix_rendimiento', type:'likert_1_5', required:true, label:'¿Qué tan rápida y estable es la app cuando estás en piso?', scale:{min:1,max:5,minLabel:'Lenta o falla',maxLabel:'Rápida y estable'} },
        { id:'soporte_rapidez', type:'likert_1_5', required:true, label:'Cuando tienes un problema técnico con Emetrix, ¿qué tan rápido te lo resuelven?', scale:{min:1,max:5,minLabel:'Nunca a tiempo',maxLabel:'Siempre rápido'} },
        { id:'soporte_satisfaccion', type:'likert_1_5', required:true, label:'¿Qué tan satisfecho(a) estás con la atención del equipo de soporte técnico?', scale:{min:1,max:5,minLabel:'Muy insatisfecho',maxLabel:'Muy satisfecho'} },
        { id:'emetrix_mejora', type:'long_text', required:false, maxLength:500, label:'Si pudieras agregar o mejorar UNA función de Emetrix, ¿cuál sería?', placeholder:'Opcional...' },
      ]
    },
    {
      id: 'sueldo_crecimiento', title: 'Sueldo, prestaciones y crecimiento',
      questions: [
        { id:'sueldo_justo', type:'likert_1_5', required:true, label:'¿Qué tan justo consideras tu sueldo en relación al trabajo que haces?', scale:{min:1,max:5,minLabel:'Muy injusto',maxLabel:'Muy justo'} },
        { id:'oportunidades_crecimiento', type:'likert_1_5', required:true, label:'¿Sientes que hay oportunidades de crecer dentro de Evolve?', scale:{min:1,max:5,minLabel:'Ninguna',maxLabel:'Muchas'} },
        { id:'orgullo_evolve', type:'single_choice', required:true, label:'¿Te has sentido orgulloso(a) en algún momento de trabajar en Evolve?',
          options:[{value:'frecuentemente',label:'Sí, frecuentemente'},{value:'a_veces',label:'A veces'},{value:'rara_vez',label:'Rara vez'},{value:'nunca',label:'Nunca'}] },
      ]
    },
    {
      id: 'cierre', title: 'Tu mensaje a la dirección',
      questions: [
        { id:'mensaje_direccion', type:'long_text', required:false, maxLength:1000, label:'Si tuvieras la oportunidad de mandarle un mensaje directo a la dirección de Evolve, ¿qué le dirías?', placeholder:'Opcional. Lo que tú quieras decir, sin filtros...' },
      ]
    },
  ] as Section[],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function flattenQuestions(survey: typeof ENCUESTA_EVOLVE, answers: Answers): (Question & { sectionTitle: string })[] {
  const flat: (Question & { sectionTitle: string })[] = [];
  for (const section of survey.sections) {
    for (const q of section.questions) {
      const cond = q.condition;
      const show = !cond || answers[cond.dependsOn] === cond.equals;
      if (show) flat.push({ ...q, sectionTitle: section.title });
    }
  }
  return flat;
}

function isValid(q: Question, val: unknown): boolean {
  if (!q.required) return true;
  if (val === undefined || val === null) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  return true;
}

function enpsFeedback(n: number): { type: string; icon: string; text: string } | null {
  if (n >= 9) return { type: 'positive', icon: '✓', text: '¡Eres un promotor de Evolve!' };
  if (n >= 7) return { type: 'neutral',  icon: '·', text: '¿Qué nos faltaría para ser un 9 o 10?' };
  return        { type: 'negative', icon: '!', text: 'Tu opinión nos importa. Cuéntanos qué podemos mejorar.' };
}

// ─── Colores / tokens ─────────────────────────────────────────────────────────
const BG   = '#F5F5F7';
const INK  = '#0A0A0A';
const MUTED= '#6B7280';
const LIME = '#D8FF00';
const BORDER='#E5E5E7';
const WHITE='#ffffff';

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function SingleChoice({ q, val, onChange }: { q: Question; val: unknown; onChange:(v:string)=>void }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {q.options!.map(opt => {
        const sel = val === opt.value;
        return (
          <button key={opt.value} type="button" onClick={() => onChange(opt.value)} style={{
            display:'flex', alignItems:'center', gap:12, padding:'16px 18px',
            background: sel ? INK : WHITE, border:`1.5px solid ${sel ? INK : BORDER}`,
            borderRadius:16, width:'100%', textAlign:'left',
            fontSize:15, fontWeight:500, color: sel ? WHITE : INK,
            cursor:'pointer', transition:'all .15s',
          }}>
            <span style={{ width:20, height:20, borderRadius:'50%', border:`1.5px solid ${sel ? WHITE : '#C9C9CC'}`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {sel && <span style={{ width:10, height:10, borderRadius:'50%', background:WHITE, display:'block' }}/>}
            </span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Likert({ q, val, onChange }: { q: Question; val: unknown; onChange:(v:number)=>void }) {
  const { min, max, minLabel, maxLabel } = q.scale!;
  const items = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {items.map(n => {
          const sel = val === n;
          return (
            <button key={n} type="button" onClick={() => onChange(n)} style={{
              flex:1, aspectRatio:'1', maxHeight:64, border:`1.5px solid ${sel ? INK : BORDER}`,
              borderRadius:14, fontSize:18, fontWeight:600, color: sel ? WHITE : MUTED,
              background: sel ? INK : WHITE, cursor:'pointer', transition:'all .15s',
            }}>{n}</button>
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:MUTED, fontWeight:500, padding:'0 2px' }}>
        <span>{minLabel}</span><span>{maxLabel}</span>
      </div>
    </div>
  );
}

function EnpsScale({ q, val, onChange }: { q: Question; val: unknown; onChange:(v:number)=>void }) {
  const { min, max, minLabel, maxLabel } = q.scale!;
  const items = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const fb = typeof val === 'number' ? enpsFeedback(val) : null;
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(11,1fr)', gap:5, marginBottom:12 }}>
        {items.map(n => {
          const sel = val === n;
          return (
            <button key={n} type="button" onClick={() => onChange(n)} style={{
              aspectRatio:'1', border:`1.5px solid ${sel ? INK : BORDER}`,
              borderRadius:10, fontSize:13, fontWeight:600, color: sel ? WHITE : MUTED,
              background: sel ? INK : WHITE, cursor:'pointer', padding:0,
            }}>{n}</button>
          );
        })}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:MUTED, fontWeight:500, padding:'0 2px', marginBottom:12 }}>
        <span>{minLabel}</span><span>{maxLabel}</span>
      </div>
      {fb && (
        <div style={{
          padding:'12px 14px', borderRadius:12, fontSize:13, lineHeight:1.45, display:'flex', alignItems:'flex-start', gap:8,
          background: fb.type==='positive' ? '#ECFDF5' : fb.type==='neutral' ? '#FFF7ED' : '#FEF2F2',
          color: fb.type==='positive' ? '#065F46' : fb.type==='neutral' ? '#9A3412' : '#991B1B',
        }}>
          <span style={{ flexShrink:0, fontSize:14, marginTop:1 }}>{fb.icon}</span>
          <span>{fb.text}</span>
        </div>
      )}
    </div>
  );
}

function LongText({ q, val, onChange }: { q: Question; val: unknown; onChange:(v:string)=>void }) {
  const v = (val as string) || '';
  return (
    <div style={{ display:'flex', flexDirection:'column' }}>
      <textarea
        value={v} maxLength={q.maxLength} placeholder={q.placeholder}
        onChange={e => onChange(e.target.value)}
        style={{ width:'100%', minHeight:130, padding:'14px 16px', border:`1.5px solid ${BORDER}`,
          borderRadius:16, fontSize:15, color:INK, resize:'none', lineHeight:1.5,
          outline:'none', fontFamily:'inherit', background:WHITE, boxSizing:'border-box' }}
      />
      <div style={{ fontSize:12, color:MUTED, textAlign:'right', marginTop:6, fontWeight:500 }}>
        {v.length} / {q.maxLength}
      </div>
    </div>
  );
}

// ─── Props del SurveyScreen ───────────────────────────────────────────────────
interface Props {
  onDone: () => void;
  userName?: string;
  userGroup?: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function SurveyScreen({ onDone, userName, userGroup }: Props) {
  // Seleccionar encuesta según el grupo del usuario
  const ENCUESTA = userGroup === 'Evolve' ? ENCUESTA_EVOLVE : ENCUESTA_PROMOTORES;
  const [step, setStep]           = useState<'welcome'|'questions'|'completion'>('welcome');
  const [idx, setIdx]             = useState(0);
  const [answers, setAnswers]     = useState<Answers>({});
  const [startedAt, setStartedAt] = useState<string|null>(null);
  const [completedAt, setCompletedAt] = useState<string|null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [err, setErr]             = useState<string|null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restaurar progreso de localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ENCUESTA.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.answers) setAnswers(data.answers);
        if (data.startedAt) setStartedAt(data.startedAt);
        if (typeof data.idx === 'number') setIdx(data.idx);
      }
    } catch { /* ignore */ }
  }, []);

  // Persistir progreso
  useEffect(() => {
    if (step !== 'questions') return;
    try {
      localStorage.setItem(ENCUESTA.storageKey, JSON.stringify({ answers, startedAt, idx }));
    } catch { /* ignore */ }
  }, [answers, idx, startedAt, step]);

  const flat      = useMemo(() => flattenQuestions(ENCUESTA, answers), [ENCUESTA, answers]);
  const total     = flat.length;
  const q         = flat[idx];
  const canNext   = q ? isValid(q, answers[q.id]) : false;
  const progress  = total > 0 ? ((idx + 1) / total) * 100 : 0;
  const hasProgress = Object.keys(answers).length > 0;

  const initials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)
    : 'YO';

  const scrollTop = () => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const handleStart = () => {
    if (!startedAt) setStartedAt(new Date().toISOString());
    setStep('questions');
  };

  const handleAnswer = (qId: string) => (val: string|number) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  const handleNext = () => {
    if (idx < total - 1) { setIdx(i => i + 1); scrollTop(); }
    else handleSubmit();
  };

  const handlePrev = () => {
    if (idx > 0) { setIdx(i => i - 1); scrollTop(); }
  };

  const handleSubmit = async () => {
    setSubmitting(true); setErr(null);
    const completed = new Date().toISOString();
    setCompletedAt(completed);
    const durationSeconds = Math.round((new Date(completed).getTime() - new Date(startedAt!).getTime()) / 1000);
    const payload = { surveyId: ENCUESTA.id, version: ENCUESTA.version, startedAt, completedAt: completed, durationSeconds, answers };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (res.status === 409) {
          // Ya completada — avanzar directo
          localStorage.removeItem(ENCUESTA.storageKey);
          setSubmitting(false); setStep('completion'); return;
        }
        throw new Error(d.error ?? `Error ${res.status}`);
      }
      localStorage.removeItem(ENCUESTA.storageKey);
      setSubmitting(false); setStep('completion');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al enviar. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  const duration = startedAt && completedAt
    ? Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    : 0;

  return (
    <div ref={scrollRef} style={{ width:'100%', minHeight:'100dvh', background:BG, display:'flex', flexDirection:'column', position:'relative', overflowY:'auto', overflowX:'hidden', fontFamily:'inherit' }}>
      {/* Header */}
      <div style={{ padding:'20px 20px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', background:BG, position:'sticky', top:0, zIndex:10 }}>
        <span style={{ fontSize:20, fontWeight:600, letterSpacing:'-0.3px', color:INK }}>Torneo 2026</span>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'#1AAFFF', color:WHITE, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600 }}>{initials}</div>
      </div>

      {/* ── Bienvenida ── */}
      {step === 'welcome' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'0 24px 24px' }}>
          <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center', padding:'20px 0' }}>
            <div style={{ width:80, height:80, borderRadius:18, overflow:'hidden', marginBottom:6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/evolve-mark.png" alt="Evolve" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            </div>
            <div style={{ fontSize:9, fontWeight:600, letterSpacing:'1.2px', color:MUTED, marginBottom:16 }}>GRUPO EVOLVE</div>
            <h1 style={{ fontSize:32, fontWeight:700, letterSpacing:'-1px', margin:'0 0 10px' }}>¡Hola!</h1>
            <p style={{ fontSize:15, color:MUTED, lineHeight:1.5, margin:'0 0 28px', maxWidth:320 }}>
              Cuéntanos cómo te sientes trabajando en Evolve. Tu opinión es 100% anónima y nos ayuda a mejorar.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8, width:'100%' }}>
              {[
                { bg:'#ECFDF5', color:'#059669', icon:'✓', title:'Totalmente anónima', sub:'Nadie sabrá que fuiste tú' },
                { bg:'#EFF6FF', color:'#2563EB', icon:'◷', title:'8 a 10 minutos', sub:'Puedes pausar y continuar después' },
                { bg:'#FFFBEB', color:'#D97706', icon:'★', title:'Acceso a la quiniela', sub:'Torneo 2026 te espera' },
              ].map(p => (
                <div key={p.title} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:WHITE, borderRadius:16 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:p.bg, color:p.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{p.icon}</div>
                  <div>
                    <strong style={{ display:'block', fontSize:14, fontWeight:600, marginBottom:2, color:INK }}>{p.title}</strong>
                    <span style={{ fontSize:12, color:MUTED, lineHeight:1.3 }}>{p.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={handleStart} style={{ width:'100%', padding:'16px', background:INK, color:WHITE, border:'none', borderRadius:16, fontSize:15, fontWeight:600, cursor:'pointer', marginTop:16 }}>
            {hasProgress ? 'Continuar encuesta' : 'Comenzar encuesta'}
          </button>
        </div>
      )}

      {/* ── Preguntas ── */}
      {step === 'questions' && q && (
        <>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'1px', color:MUTED, textTransform:'uppercase', padding:'0 24px', marginBottom:10 }}>
            {q.sectionTitle}
          </div>
          <div style={{ padding:'4px 24px 18px' }}>
            <div style={{ height:4, background:'#E5E5E7', borderRadius:999, overflow:'hidden' }}>
              <div style={{ height:'100%', background:INK, borderRadius:999, width:`${progress}%`, transition:'width .4s ease' }}/>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:MUTED, marginTop:8, fontWeight:500 }}>
              <span>Pregunta {idx+1} de {total}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          <div style={{ background:WHITE, borderRadius:24, padding:'24px 20px', margin:'0 16px 14px' }}>
            {q.sensitive && (
              <div style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'4px 10px', background:'#FEF3C7', color:'#92400E', borderRadius:999, fontSize:10, fontWeight:600, marginBottom:10 }}>
                🔒 Pregunta confidencial
              </div>
            )}
            <h2 style={{ fontSize:18, fontWeight:600, lineHeight:1.35, color:INK, margin:'0 0 20px', letterSpacing:'-0.3px' }}>{q.label}</h2>
            {q.type === 'single_choice' && <SingleChoice q={q} val={answers[q.id]} onChange={handleAnswer(q.id)} />}
            {q.type === 'likert_1_5'   && <Likert       q={q} val={answers[q.id]} onChange={v => handleAnswer(q.id)(v as number)} />}
            {q.type === 'scale_0_10'   && <EnpsScale    q={q} val={answers[q.id]} onChange={v => handleAnswer(q.id)(v as number)} />}
            {q.type === 'long_text'    && <LongText     q={q} val={answers[q.id]} onChange={handleAnswer(q.id)} />}
          </div>

          {!q.required && q.type === 'long_text' && (
            <div style={{ fontSize:12, color:MUTED, padding:'8px 24px', textAlign:'center', fontWeight:500 }}>
              Esta pregunta es opcional. Puedes saltarla.
            </div>
          )}

          {err && (
            <div style={{ margin:'0 16px 12px', padding:'12px 16px', background:'#FEF2F2', color:'#991B1B', borderRadius:12, fontSize:13 }}>
              ⚠️ {err}
            </div>
          )}

          <div style={{ position:'sticky', bottom:0, padding:'14px 16px 22px', background:`linear-gradient(to bottom, rgba(245,245,247,0) 0%, ${BG} 30%)`, display:'flex', gap:10 }}>
            {idx > 0 && (
              <button onClick={handlePrev} style={{ padding:'16px', background:WHITE, color:INK, border:`1.5px solid ${BORDER}`, borderRadius:16, fontSize:15, fontWeight:600, cursor:'pointer', maxWidth:100, flex:1 }}>Anterior</button>
            )}
            <button onClick={handleNext} disabled={!canNext || submitting} style={{
              flex:2, padding:'16px', background: (!canNext||submitting) ? '#C9C9CC' : INK,
              color:WHITE, border:'none', borderRadius:16, fontSize:15, fontWeight:600,
              cursor: (!canNext||submitting) ? 'not-allowed' : 'pointer', transition:'background .15s',
            }}>
              {submitting ? 'Enviando…' : idx === total - 1 ? 'Enviar respuestas' : 'Siguiente'}
            </button>
          </div>
        </>
      )}

      {/* ── Completado ── */}
      {step === 'completion' && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center', padding:'40px 30px' }}>
          <div style={{ width:96, height:96, borderRadius:'50%', background:INK, display:'flex', alignItems:'center', justifyContent:'center', color:LIME, fontSize:48, fontWeight:700, marginBottom:24 }}>✓</div>
          <h1 style={{ fontSize:28, fontWeight:700, letterSpacing:'-0.8px', margin:'0 0 12px' }}>¡Listo!</h1>
          <p style={{ fontSize:15, color:MUTED, lineHeight:1.5, maxWidth:320, margin:'0 0 32px' }}>
            Tus respuestas quedaron registradas de forma anónima. Tu acceso a la quiniela ya está activo.
            {duration > 60 && <><br/><br/><strong>Gracias por dedicar {Math.round(duration/60)} {Math.round(duration/60)===1?'minuto':'minutos'}.</strong></>}
          </p>
          <button onClick={onDone} style={{ width:'100%', padding:'17px', background:INK, color:WHITE, border:'none', borderRadius:16, fontSize:15, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
            <span>Ir a la quiniela</span><span>→</span>
          </button>
          <div style={{ fontSize:11, fontWeight:600, letterSpacing:'1px', color:'#9CA3AF', marginTop:16 }}>TORNEO 2026</div>
        </div>
      )}

      {/* Overlay de envío */}
      {submitting && step === 'questions' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:WHITE, padding:24, borderRadius:16, fontWeight:600, fontSize:15 }}>Enviando…</div>
        </div>
      )}
    </div>
  );
}
