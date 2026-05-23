# Informe de Desarrollo y Aplicacion de DDD en WeatherFlow

> Nota de alcance: este informe documenta Delivery I, cuando WeatherFlow era un
> monolito modular. La topologia actual de Delivery II esta descrita en
> `docs/architecture-overview.md` y separa la API service de la Notification
> service con RabbitMQ y limites REST.

## 1. Introduccion

WeatherFlow es una plataforma de servicios meteorologicos desarrollada como un monolito en NestJS con persistencia en MongoDB. El objetivo del trabajo fue modelar e implementar una solucion capaz de gestionar usuarios, estaciones meteorologicas y mediciones climaticas, incorporando reglas de negocio para la deteccion de alertas y documentando la arquitectura de forma consistente.

Desde la consigna inicial, el proyecto no se planteo como una API generica, sino como un ejercicio de modelado y construccion arquitectonica. Por ese motivo, las decisiones tecnicas estuvieron condicionadas por varios requisitos explicitos: uso de arquitectura hexagonal, aplicacion de DDD, implementacion de puertos y adaptadores, persistencia en MongoDB Atlas, exposicion de una API documentada y mantenimiento de diagramas tecnicos y tests de dominio.

Este informe describe como fue evolucionando el desarrollo, de que manera se implemento DDD y cuales fueron las principales decisiones de diseno que se tomaron para mantener consistencia entre el modelo de dominio, la API y la infraestructura.

## 2. Punto de partida y condicionantes de la consigna

La solicitud original definio varias restricciones que marcaron el rumbo del proyecto:

- la solucion debia ser un monolito;
- la arquitectura debia ser hexagonal;
- el modelado debia usar DDD, con entidades, agregados, agregados raiz y objetos de valor;
- la logica de negocio principal debia evaluar umbrales climaticos al registrar una medicion;
- la persistencia debia realizarse sobre MongoDB Atlas;
- la entrega debia incluir tests de dominio, Swagger, diagramas UML, diagramas de secuencia, C4 y flujo de trabajo con feature branches.

Estas restricciones fueron importantes porque evitaron una implementacion puramente pragmatica o centrada en controladores. En lugar de eso, obligaron a pensar primero en el dominio, luego en las capas, y finalmente en los mecanismos de entrada y salida del sistema.

## 3. Criterio general de arquitectura

La arquitectura adoptada fue una combinacion de DDD y arquitectura hexagonal. En la practica, esto se materializo organizando cada modulo alrededor de cuatro sectores:

- `domain`: entidades, value objects, eventos y contratos del dominio;
- `application`: casos de uso y coordinacion del flujo;
- `infrastructure`: repositorios MongoDB, mappers, estrategias JWT y adapters concretos;
- `interface`: controladores REST, DTOs y validaciones de entrada/salida.

Este enfoque tuvo dos ventajas principales. La primera fue mantener aislada la logica de negocio respecto de NestJS, Swagger, Mongoose o Telegram. La segunda fue permitir que las decisiones de integracion cambiaran sin deformar el modelo del dominio.

## 4. Como se implemento DDD en WeatherFlow

### 4.1 Bounded context y nucleos del dominio

El proyecto se puede leer como un unico bounded context llamado `WeatherFlow`, dentro del cual existen tres nucleos principales del dominio:

- `User`
- `WeatherStation`
- `Measurement`

Ademas, `auth` y `notifications` quedaron como modulos de soporte. Esta distincion es importante: autenticacion y notificaciones son necesarias para operar el sistema, pero no forman parte del nucleo del problema meteorologico planteado por la consigna.

### 4.2 Agregados y agregados raiz

Los tres agregados principales se organizaron alrededor de sus respectivas entidades raiz:

- `User` como raiz del agregado de usuarios y preferencias de alerta;
- `WeatherStation` como raiz del agregado de estaciones;
- `Measurement` como raiz del agregado de mediciones y deteccion de alertas.

Cada agregado encapsula sus propios datos y reglas, evitando que la logica de negocio quede dispersa en controladores o repositorios.

### 4.3 Objetos de valor

El proyecto implemento varios value objects para evitar trabajar directamente con primitivas sin significado de dominio. Entre los mas relevantes aparecen:

- `Email`
- `Location`
- `Temperature`
- `Humidity`
- `Pressure`

El uso de value objects permitio concentrar validaciones e invariantes dentro del dominio. Esto mejora la expresividad del modelo y reduce el riesgo de errores por validaciones repetidas o inconsistentes en otras capas.

### 4.4 Reglas de negocio en el dominio

La regla central del sistema consiste en evaluar una medicion al momento de registrarla. Si se supera alguno de los umbrales definidos, la medicion pasa a tener estado de alerta y un tipo de alerta asociado.

Las condiciones implementadas responden a la consigna:

- temperatura mayor a 40 C: calor extremo;
- temperatura menor a 0 C: helada;
- presion menor a 980 hPa: tormenta;
- humedad mayor a 90%: humedad critica.

Lo importante no es solo que estas reglas existan, sino donde quedaron ubicadas. La evaluacion se concentro en el dominio, no en la capa HTTP ni en la persistencia. Eso refuerza el criterio de que la logica del negocio debe sobrevivir aunque cambien los adapters o la forma de exponer la API.

### 4.5 Puertos y adaptadores

Los puertos representan capacidades que el dominio o la aplicacion necesitan, pero cuya implementacion concreta no les corresponde conocer. En WeatherFlow se usaron, entre otros:

- repositorios de usuarios, estaciones y mediciones;
- servicio de hash de contrasenas;
- servicio de generacion de tokens;
- puerto de notificacion de alertas.

Las implementaciones concretas de estos puertos quedaron en infraestructura: repositorios MongoDB, JWT, bcrypt y adapter de Telegram. De esa manera, la direccion de dependencias se mantiene hacia adentro.

## 5. Evolucion cronologica del desarrollo

### 5.1 Fundacion del proyecto

La primera etapa estuvo orientada a construir una base tecnica estable. En el historial del repositorio esto aparece consolidado en la epic de fundacion (`E-01`), cerrada el 18 de abril de 2026 y luego integrada al desarrollo principal el 25 de abril de 2026.

En esta fase se resolvieron decisiones estructurales:

- bootstrap del proyecto con NestJS 11;
- configuracion estricta de TypeScript;
- ESLint, Prettier y Jest;
- estructura hexagonal por modulo;
- Docker Compose para MongoDB local;
- configuracion de entorno validada;
- README y reglas de workflow con feature branches.

Esta etapa fue clave porque evito que la arquitectura quedara como una intencion teorica. Desde el inicio ya existia una estructura preparada para trabajar por capas y por modulo.

### 5.2 Construccion del dominio

La segunda etapa se centro en modelar los conceptos principales del problema. El historial muestra una secuencia bastante clara durante el 25 de abril de 2026:

- creacion de value objects climaticos validados;
- incorporacion del agregado `User`;
- incorporacion del agregado `WeatherStation`;
- incorporacion del agregado `Measurement`;
- desarrollo del servicio de dominio `AlertEvaluator`;
- fortalecimiento de cobertura de tests del dominio.

Esta fase es la que mejor representa la adopcion de DDD. Antes de avanzar sobre controladores o persistencia, se definieron los conceptos que expresan el lenguaje del dominio y las reglas que les dan comportamiento.

### 5.3 Capa de aplicacion

Una vez estabilizado el modelo, se avanzo con servicios de aplicacion y puertos. En esta etapa aparecieron los casos de uso para:

- autenticacion y registro;
- gestion de estaciones;
- consulta y registro de mediciones;
- suscripcion a alertas;
- gestion de preferencias de notificacion.

La decision relevante en esta fase fue no usar la capa de aplicacion como un segundo dominio. Los servicios quedaron pensados como orquestadores: reciben datos, invocan entidades o servicios de dominio, y coordinan repositorios o eventos, pero no reemplazan el modelado del negocio.

### 5.4 Infraestructura y API

Luego se incorporaron los adapters concretos:

- schemas y mappers para Mongoose;
- repositorios MongoDB;
- controladores y DTOs REST;
- wiring de modulos NestJS;
- autenticacion JWT;
- soporte de Swagger y luego autorizacion Bearer;
- script para datos mock de Swagger.

Esta etapa completo el camino entre el modelo de dominio y la entrega funcional pedida por la consigna. Tambien fue donde aparecio con mas fuerza la necesidad de controlar que la infraestructura no contaminara el dominio.

### 5.5 Documentacion tecnica y presentacion

En una etapa posterior se trabajaron especificamente los entregables de arquitectura:

- diagramas C4 de contexto, contenedores y componentes;
- UML del dominio;
- UML de puertos y adaptadores;
- diagramas de secuencia;
- documentacion general de arquitectura, dominio y API.

El proyecto no solo implemento la solucion, sino que tambien fue produciendo representaciones del sistema para justificar y comunicar las decisiones tomadas.

## 6. Decisiones de desarrollo mas importantes

### 6.1 Elegir un monolito modular

La consigna exigia un unico componente, por lo que se opto por un monolito modular. En lugar de tratarlo como una limitacion, se lo aprovecho para organizar el sistema por modulos de negocio bien delimitados. Esto permitio cumplir con el requerimiento sin resignar separacion interna de responsabilidades.

### 6.2 Tratar `users`, `stations` y `measurements` como nucleos del dominio

Esta fue una decision de modelado importante. Aunque el sistema incluye autenticacion y notificaciones, esos modulos no se tomaron como parte del nucleo del negocio meteorologico. Esa lectura permitio ordenar mejor el proyecto:

- el dominio principal quedo centrado en usuarios, estaciones y mediciones;
- `auth` se trato como un modulo de soporte;
- `notifications` se trato como un modulo de soporte desacoplado del dominio principal.

Esta separacion ayudo a no mezclar requerimientos de operacion con requerimientos propios del problema que se debia resolver.

### 6.3 Evitar que Telegram definiera el modelo de notificaciones

Una de las decisiones mas significativas fue desacoplar notificaciones de Telegram. Telegram no formaba parte de la solicitud inicial, por lo que no resultaba correcto que condicionara el modelado del dominio.

En la practica, esto llevo a separar:

- las preferencias de alerta del usuario;
- los canales de entrega;
- la implementacion concreta de Telegram como adapter.

Este cambio permitio que las notificaciones se mantuvieran conceptualmente independientes del medio de envio. Telegram paso a ser un mecanismo de entrega y no una propiedad constitutiva del modelo de negocio.

### 6.4 Separar el registro de alertas del envio de notificaciones

Otra decision importante fue desacoplar la deteccion de alertas del proceso de notificacion. El sistema debia poder registrar y clasificar una alerta aunque no existiera ningun canal configurado o aunque un medio externo fallara.

Por eso se incorporo una logica basada en eventos, donde la alerta se detecta en el flujo de mediciones y luego se procesa aparte para decidir a quien avisar y por que medio. Esta decision mejoro:

- la independencia de la logica de negocio;
- la trazabilidad del flujo;
- la capacidad de evolucionar notificaciones sin tocar la deteccion de alertas.

### 6.5 Introducir autenticacion como soporte y no como centro del dominio

La autenticacion tampoco formaba parte del nucleo inicial del problema, pero fue necesaria para poder operar mejor la API, especialmente en el uso de Swagger con distintos usuarios. Modelarla como modulo de soporte permitio sumar seguridad y trazabilidad sin desplazar el foco del dominio meteorologico.

## 7. El caso de notificaciones: la decision de dominio mas dificil

La decision mas compleja del proyecto fue identificar las responsabilidades de dominio vinculadas a notificaciones. El problema no era simplemente tecnico; era de modelado.

Habia que responder varias preguntas:

- que parte del comportamiento correspondia al dominio;
- que parte pertenecia a un caso de uso;
- que parte debia quedar en un adapter externo;
- hasta que punto Telegram podia o no aparecer en el modelo.

La solucion final fue distinguir tres niveles:

- el dominio define que es una alerta y que preferencias tiene un usuario;
- la aplicacion decide a quien notificar y construye el mensaje de salida;
- la infraestructura materializa el envio a traves de Telegram.

Esta separacion no solo mejoro la arquitectura; tambien hizo que el sistema reflejara mejor la consigna, donde lo importante era la logica de alertas y no un proveedor especifico de mensajeria.

## 8. Refactor de dominio: separar preferencias de alerta y canales de entrega

El commit `feat(users): separate notification preferences from delivery channels`, fechado el 25 de abril de 2026, representa un ajuste relevante del modelo de dominio.

Conceptualmente, este cambio sirvio para diferenciar dos preguntas distintas:

- sobre que eventos quiere ser alertado un usuario;
- por que medio quiere recibir esas alertas.

Antes de esa separacion, habia riesgo de mezclar ambas preocupaciones y de hacer que los canales concretos de entrega influyeran sobre el modelo del usuario mas de lo necesario. Tratarlo como un refactor de dominio fue acertado porque el problema no estaba en el controller o en la base de datos, sino en la forma de representar correctamente las responsabilidades del agregado `User`.

## 9. Refactor de fortalecimiento arquitectonico antes de la presentacion

### 9.1 Contexto general

El ultimo gran refactor del proyecto fue `refactor: align DDD boundaries and enrich graphify output`, integrado el 29 de abril de 2026 y compuesto por cambios en 95 archivos. Su objetivo principal no fue agregar funcionalidad nueva, sino fortalecer la arquitectura antes de presentar el trabajo.

Eso le da un valor especial: fue una etapa de consolidacion, donde se reviso si el codigo realmente expresaba los principios que la documentacion declaraba.

### 9.2 Motivos principales del refactor

Los motivos mas importantes pueden resumirse asi:

- alinear mejor los limites entre dominio, aplicacion, interfaz e infraestructura;
- evitar dependencias conceptualmente invertidas;
- corregir zonas donde los puertos no estaban ubicados de la forma mas coherente con DDD;
- reducir el acoplamiento entre modulos del nucleo;
- hacer visible la arquitectura tambien a nivel de tooling y verificable mediante tests.

### 9.3 Cambios relevantes realizados

El refactor introdujo varios cambios concretos:

- los contratos principales de repositorios y servicios de soporte quedaron definidos desde `domain/ports`;
- la capa `application` paso a consumir esos contratos sin apropiarse de ellos como si fueran propios;
- se reorganizaron imports y referencias para restablecer la direccion correcta de dependencias;
- se extrajo `AlertSettings` a `src/shared/domain/alert-settings.ts`;
- `Measurement` dejo de depender de un objeto de valor especifico del modulo `stations` para evaluar alertas;
- se reforzaron tests de servicios, mappers, controladores y estrategias;
- se agregaron tests especificos de fronteras de arquitectura;
- se enriquecio `graphify` para clasificar nodos por modulo, capa, rol y tipo de modulo.

### 9.4 Por que mover los puertos hacia el dominio

Uno de los cambios mas importantes del refactor fue ubicar formalmente los puertos en el dominio. Esta decision tiene sentido porque los puertos expresan necesidades del modelo y de los casos de uso respecto del mundo exterior, no implementaciones concretas.

Dejar esos contratos definidos en `application` podia funcionar tecnicamente, pero debilitaba la narrativa arquitectonica. Reubicarlos en `domain/ports` hizo que el proyecto representara con mas claridad la idea de que el centro del sistema define sus dependencias en terminos abstractos, mientras que las capas externas las satisfacen.

### 9.5 Por que extraer `AlertSettings` al dominio compartido

Antes del refactor, la evaluacion de alertas en `Measurement` dependia de `StationAlertSettings`, un objeto de valor perteneciente al modulo de estaciones. Esa relacion generaba un acoplamiento innecesario entre dos nucleos del dominio.

La extraccion a un contrato compartido (`AlertSettings`) resolvio dos problemas:

- evito que `Measurement` dependiera de detalles de modelado del agregado `WeatherStation`;
- permitio expresar la configuracion de alertas como una preocupacion transversal del dominio y no como propiedad exclusiva de estaciones.

Este cambio fue importante porque mejora la independencia entre agregados, algo central en un modelo orientado a DDD.

### 9.6 Por que enriquecer graphify y sumar tests de fronteras

El refactor tambien incorporo una capa de verificacion arquitectonica. No se trato solo de tener diagramas, sino de validar automaticamente si el codigo respetaba las reglas que esos diagramas decian representar.

En este punto, `graphify` paso a cumplir una doble funcion:

- ofrecer una visualizacion mas rica del sistema;
- servir como apoyo para revisar bounded context, modulos, capas y roles.

Ademas, los tests de arquitectura permiten detectar violaciones como:

- imports de infraestructura dentro del dominio;
- imports de interfaz o infraestructura desde aplicacion;
- dependencias no permitidas entre capas.

En terminos de presentacion, este punto suma mucho porque muestra que la arquitectura no fue solo declarativa, sino tambien controlada.

### 9.7 Impacto del refactor

El impacto del refactor fue alto porque afecto 95 archivos, pero su sentido no fue cosmetico. Sirvio para:

- hacer mas coherente el proyecto con sus principios de DDD;
- mejorar la legibilidad del modelo;
- reducir acoplamientos entre modulos;
- fortalecer la calidad de la documentacion tecnica;
- llegar a la presentacion con una arquitectura mas defendible.

## 10. Herramientas utilizadas durante el desarrollo

Las herramientas mas importantes del proyecto fueron:

- `NestJS 11` como framework base para estructurar modulos, controladores e inyeccion de dependencias;
- `TypeScript` en modo estricto para reforzar seguridad de tipos;
- `MongoDB` y `Mongoose` para persistencia;
- `Swagger / OpenAPI` para documentar y probar la API;
- `JWT`, `Passport` y `bcrypt` para autenticacion;
- `Jest` y `SWC` para tests unitarios y de integracion;
- `Docker Compose` para el entorno local de base de datos;
- `Graphify` para analizar la estructura del proyecto y enriquecer la lectura arquitectonica;
- diagramas `C4`, `UML` y de secuencia para documentacion de arquitectura;
- `Git` con feature-branch workflow para ordenar el desarrollo por cambios acotados.

En un proyecto de este tipo, estas herramientas no solo facilitaron la implementacion, sino tambien la comunicacion del diseno y la preparacion para la entrega.

## 11. Limitaciones y deuda tecnica

Aunque el proyecto alcanzo una base arquitectonica solida, tambien quedaron algunas tensiones razonables:

- mantener pureza de capas dentro de un framework como NestJS requiere vigilancia constante;
- los modulos de soporte, especialmente notificaciones, pueden seguir creciendo y exigir nuevas decisiones de modelado;
- MongoDB resuelve bien la persistencia del trabajo, pero obliga a documentar cuidadosamente relaciones que no son naturalmente relacionales;
- la consistencia entre codigo, diagramas y documentacion necesita mantenimiento continuo;
- parte de la robustez arquitectonica se logro mediante refactors posteriores, lo que muestra que la separacion correcta de responsabilidades no siempre aparece desde la primera iteracion.

Estas limitaciones no invalidan la solucion. Al contrario, ayudan a mostrar que la arquitectura fue trabajada de manera iterativa y consciente.

## 12. Conclusiones

WeatherFlow no se desarrollo solo como una API funcional, sino como una implementacion orientada a sostener criterios de modelado y arquitectura. La aplicacion de DDD se refleja en la existencia de agregados claros, value objects, reglas de negocio ubicadas en el dominio y una separacion cuidadosa entre el nucleo del problema y los mecanismos de integracion.

Las decisiones mas importantes del proyecto estuvieron relacionadas con preservar independencia conceptual:

- independencia del dominio respecto de la infraestructura;
- independencia de las notificaciones respecto de Telegram;
- independencia del registro de alertas respecto de su envio;
- independencia entre agregados del nucleo cuando aparecian acoplamientos innecesarios.

El refactor final de alineacion DDD tuvo un papel especialmente importante porque convirtio esas decisiones en algo mas visible, verificable y defendible. En ese sentido, el proyecto termino no solo funcionando, sino tambien mostrando con mayor claridad por que fue construido de esa manera.
