
/**
 * Задать настройки подключения для мотора1.
 */
void init_motor1(int pin_pulse, int pin_dir, int pin_en, int pulse_delay, int dir_inv);

/**
 * Задать настройки подключения для мотора2.
 */
void init_motor2(int pin_pulse, int pin_dir, int pin_en, int pulse_delay, int dir_inv);

/**
 * Подготовить мотор1 к запуску - задать нужное количество шагов и задержку между
 * шагами для регулирования скорости (0 для максимальной скорости).
 */
void prepare_motor1_steps(int step_count, int step_delay);

/**
 * Подготовить мотор2 к запуску - задать нужное количество шагов и задержку между
 * шагами для регулирования скорости (0 для максимальной скорости).
 */
void prepare_motor2_steps(int step_count, int step_delay);

/**
 * Запустить цикл шагов на выполнение - запускаем таймер, обработчик прерываний
 * отрабатывать подготовленную программу.
 */
void start_stepper_cycle();

/**
 * Текущий статус цикла:
 * true - в процессе выполнения,
 * false - ожидает.
 */
bool is_cycle_running();

int get_motor1_step_count();
int get_motor2_step_count();

