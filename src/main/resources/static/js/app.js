
const Calculator = {
	// =======================================================
	// 1. 状態と要素の定義
	// =======================================================
	calculationRowsContainer: document.getElementById('calculationRowsContainer'),
	keypad: document.getElementById('keypad'),
	operatorButtons: document.querySelectorAll('.operator-btn'),
	addRowButton: document.getElementById('addRowButton'),
	currentInput: null,
	activeRowId: 1,

	// ------------------------------------------------------------------
	// ユーティリティ (桁揃えHTML生成)
	// ------------------------------------------------------------------
	generateMathHTML(operator, strX, strY, finalResult, carriesOrBorrows) {
		const numCols = finalResult.length;
		let html = '';
		const gridStyle = `style="--cols: ${numCols}"`;

		// 1. 繰り上がり/繰り下がりの行
		if (carriesOrBorrows && carriesOrBorrows.some(c => c !== '')) {
			const carryRow = carriesOrBorrows.join('');
			html += `<div class="math-row carry-row" ${gridStyle}>`;
			html += `<div class="operator-cell"></div>`;

			const paddedCarry = carryRow.padStart(numCols, ' ');
			for (let i = 0; i < numCols; i++) {
				html += `<div class="digit">${paddedCarry[i] === ' ' ? '' : paddedCarry[i]}</div>`;
			}
			html += `</div>`;
		}

		// 2. 最初の数 (X)
		html += `<div class="math-row" ${gridStyle}>`;
		html += `<div class="operator-cell"></div>`;

		const paddedX = strX.padStart(numCols, ' ');
		for (let i = 0; i < numCols; i++) {
			html += `<div class="digit">${paddedX[i]}</div>`;
		}
		html += `</div>`;

		// 3. 2番目の数 (Y) と演算子
		html += `<div class="math-row" ${gridStyle}>`;
		html += `<div class="operator-cell">${operator}</div>`;

		const paddedY = strY.padStart(numCols, ' ');
		for (let i = 0; i < numCols; i++) {
			html += `<div class="digit">${paddedY[i]}</div>`;
		}
		html += `</div>`;

		// 線
		html += `<div class="horizontal-line" ${gridStyle}><div class="operator-cell"></div><div class="line-area"></div></div>`;

		// 4. 答えの行
		html += `<div class="math-row answer-row" ${gridStyle}>`;
		html += `<div class="operator-cell"></div>`;

		for (let i = 0; i < numCols; i++) {
			html += `<div class="digit">${finalResult[i]}</div>`;
		}
		html += `</div>`;

		return html;
	},

	// ------------------------------------------------------------------
	// 途中式ロジック (加算)
	// ------------------------------------------------------------------
	showAdditionProcess(rowId, x, y) {
		const processElement = document.getElementById(`process_${rowId}`);
		if (!processElement) return;

		let strX = String(Math.abs(x));
		let strY = String(Math.abs(y));
		const maxLength = Math.max(strX.length, strY.length);

		let digitsX = strX.split('').map(Number).reverse();
		let digitsY = strY.split('').map(Number).reverse();
		let resultDigits = [];
		let carries = [];
		let carry = 0;

		for (let i = 0; i < maxLength; i++) {
			const dX = digitsX[i] || 0;
			const dY = digitsY[i] || 0;

			const sum = dX + dY + carry;
			resultDigits.push(sum % 10);
			carry = Math.floor(sum / 10);
			carries.push(carry);
		}

		if (carry > 0) {
			resultDigits.push(carry);
		}

		const rawFinalResult = resultDigits.reverse().join('');
		const finalResult = String(parseInt(rawFinalResult, 10));

		let adjustedCarries = carries.reverse().map(c => c > 0 ? String(c) : '');

		if (adjustedCarries.length > finalResult.length - 1) {
			adjustedCarries.shift();
		}

		const carryLine = adjustedCarries
			.map(c => c || ' ')
			.join('')
			.padStart(finalResult.length - 1, ' ')
			.split('');

		processElement.innerHTML = this.generateMathHTML('+', strX, strY, finalResult, carryLine);
	},

	// ------------------------------------------------------------------
	// 途中式ロジック (減算)
	// ------------------------------------------------------------------
	showSubtractionProcess(rowId, x, y) {
		const processElement = document.getElementById(`process_${rowId}`);
		if (!processElement || x < y) {
			this.showSimpleProcess(rowId, x, y, '-', x - y);
			return;
		}

		let strX = String(x);
		let strY = String(y);
		const maxLength = Math.max(strX.length, strY.length);

		let digitsX = strX.split('').map(Number);
		let digitsY = strY.split('').map(Number);

		while (digitsX.length < maxLength) digitsX.unshift(0);
		while (digitsY.length < maxLength) digitsY.unshift(0);

		let resultDigits = [];
		let borrows = [];
		let modifiedDigitsX = [...digitsX];

		for (let i = maxLength - 1; i >= 0; i--) {
			let dX = modifiedDigitsX[i];
			const dY = digitsY[i];

			if (dX < dY) {
				dX += 10;

				for (let j = i - 1; j >= 0; j--) {
					if (modifiedDigitsX[j] > 0) {
						modifiedDigitsX[j] -= 1;
						borrows[j] = '↓';
						break;
					} else {
						modifiedDigitsX[j] = 9;
					}
				}
			}

			resultDigits.unshift(dX - dY);
		}

		const rawFinalResult = resultDigits.join('');
		const finalResult = String(parseInt(rawFinalResult, 10));

		let adjustedBorrows = [];
		const diff = maxLength - finalResult.length;

		for (let i = 0; i < finalResult.length; i++) {
			adjustedBorrows.push(borrows[i + diff] || '');
		}

		processElement.innerHTML = this.generateMathHTML('-', strX, strY, finalResult, adjustedBorrows);
	},

	// ------------------------------------------------------------------
	// 途中式ロジック (乗算)
	// ------------------------------------------------------------------
	showMultiplicationProcess(rowId, x, y) {
		const processElement = document.getElementById(`process_${rowId}`);
		if (!processElement) return;

		let strX = String(x);
		let strY = String(y);
		let finalResult = String(x * y);

		const maxLenY = strY.length;
		const maxCols = finalResult.length;
		const gridStyle = `style="--cols: ${maxCols}"`;

		let html = '';

		// 1. 最初の数 (X)
		html += `<div class="math-row" ${gridStyle}>`;
		html += `<div class="operator-cell"></div>`;
		let paddedX = strX.padStart(maxCols, ' ');
		for (let i = 0; i < maxCols; i++) {
			html += `<div class="digit">${paddedX[i] || ' '}</div>`;
		}
		html += `</div>`;

		// 2. 2番目の数 (Y) と演算子
		html += `<div class="math-row" ${gridStyle}>`;
		html += `<div class="operator-cell">×</div>`;
		let paddedY = strY.padStart(maxCols, ' ');
		for (let i = 0; i < maxCols; i++) {
			html += `<div class="digit">${paddedY[i] || ' '}</div>`;
		}
		html += `</div>`;

		// 3. 中間線 (Yが1桁でない場合のみ)
		if (maxLenY > 1) {
			html += `<div class="multiplication-line" ${gridStyle}><div class="operator-cell"></div><div class="line-area"></div></div>`;
		}

		// 4. 部分積
		let digitsY = strY.split('').map(Number).reverse();
		for (let i = 0; i < maxLenY; i++) {
			const digitY = digitsY[i];
			const partialProduct = x * digitY;
			let strPartialProduct = String(partialProduct);

			strPartialProduct += '0'.repeat(i);

			html += `<div class="math-row" ${gridStyle}>`;
			html += `<div class="operator-cell"></div>`;

			let paddedPartial = strPartialProduct.padStart(maxCols, ' ');

			for (let j = 0; j < maxCols; j++) {
				html += `<div class="digit">${paddedPartial[j] || ' '}</div>`;
			}
			html += `</div>`;
		}

		// 5. 最終線
		html += `<div class="horizontal-line" ${gridStyle}><div class="operator-cell"></div><div class="line-area"></div></div>`;

		// 6. 答えの行
		html += `<div class="math-row answer-row" ${gridStyle}>`;
		html += `<div class="operator-cell"></div>`;

		let paddedFinal = finalResult.padStart(maxCols, ' ');
		for (let i = 0; i < maxCols; i++) {
			html += `<div class="digit">${paddedFinal[i] || ' '}</div>`;
		}
		html += `</div>`;

		processElement.innerHTML = html;
	},

	// ------------------------------------------------------------------
	// 途中式ロジック (割り算)
	// ------------------------------------------------------------------
	showDivisionProcess(rowId, x, y) {
		const processElement = document.getElementById(`process_${rowId}`);
		if (!processElement) return;

		if (y === 0) {
			processElement.innerHTML = '<div>ぜろではわれないよ！</div>';
			return;
		}

		if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0) {
			processElement.innerHTML = '<div>整数同士の正の数の割り算筆算にのみ対応しています。</div>';
			return;
		}

		const initialY = y;
		const strX = String(x);
		const strY = String(y);
		const strQ = String(Math.floor(x / y));
		const qLen = strQ.length;

		const mainCols = strX.length + 1;

		let stepsHTML = '';
		let currentRemainder = 0;
		let dividendIndex = 0;
		let quotientIndex = 0;

		while (quotientIndex < qLen) {
			let workingDividend = currentRemainder * 10;

			while (workingDividend < initialY && dividendIndex < strX.length) {
				workingDividend += parseInt(strX[dividendIndex], 10);
				dividendIndex++;
			}

			let qDigit = Math.floor(workingDividend / initialY);

			if (qDigit > 0 || quotientIndex > 0) {
				quotientIndex++;
			} else {
				if (dividendIndex === strX.length) break;
				continue;
			}

			let product = qDigit * initialY;

			currentRemainder = workingDividend - product;

			const currentStepLength = (dividendIndex - 1); // 未使用だが元ロジックに維持
			const productStr = String(product);
			const productStartCol = dividendIndex - productStr.length;
			let productPadding = ' '.repeat(productStartCol);

			stepsHTML += `<div class="step-row">`;
			stepsHTML += `<div class="step-content" style="width: ${mainCols * 1.1 + 0.5}em;">`;
			stepsHTML += `<span class="step-operator">-</span>`;
			stepsHTML += `<span style="flex-grow: 1; text-align: right;">${productPadding}${productStr}</span>`;
			stepsHTML += `</div>`;
			stepsHTML += `</div>`;

			stepsHTML += `<div class="step-row"><div class="step-line"></div></div>`;

			let resultStr = String(currentRemainder);
			let nextDigit = dividendIndex < strX.length ? strX[dividendIndex] : '';

			const remainderStartCol = dividendIndex - resultStr.length;
			let remainderPadding = ' '.repeat(remainderStartCol);

			stepsHTML += `<div class="step-row">`;
			stepsHTML += `<div class="step-content" style="width: ${mainCols * 1.1 + 0.5}em;">`;
			stepsHTML += `<span style="flex-grow: 1; text-align: right;">${remainderPadding}${resultStr}${nextDigit}</span>`;
			stepsHTML += `</div>`;
			stepsHTML += `</div>`;

			workingDividend = currentRemainder;
		}

		let maxStepsWidth = (strX.length + 1) * 1.1 + 10;

		let quotientHTML = '';
		for (const digit of strQ) {
			quotientHTML += `<div class="quotient-digit">${digit}</div>`;
		}

		let finalRemainderStr = String(currentRemainder);

		let html = `
      <div class="division-container" style="min-width: ${maxStepsWidth}em;">
        <div class="quotient-row" style="min-width: ${maxStepsWidth - 10}em;">
          <div style="flex-grow: 1;"></div>
          ${quotientHTML}
        </div>
        <div class="division-main">
          <div class="division-symbol">${initialY}</div>
          <div class="division-steps" style="min-width: ${maxStepsWidth - 10}em;">
            <div class="step-row">
              <div class="step-content" style="width: 100%; justify-content: flex-start; padding-left: 0.5em;">${strX}</div>
            </div>
            ${stepsHTML}
            <div class="remainder-line" style="text-align: right; padding-right: 0.5em;">あ. ${finalRemainderStr}</div>
          </div>
        </div>
      </div>
    `;

		processElement.innerHTML = html;
	},

	// =======================================================
	// シンプルな途中式 (筆算以外)
	// =======================================================
	showSimpleProcess(rowId, x, y, operator, result) {
		const processElement = document.getElementById(`process_${rowId}`);
		if (!processElement) return;

		const displayOperator =
			operator === '*' ? '×' :
				operator === '/' ? '÷' : operator;

		processElement.innerHTML = `しき：${x} ${displayOperator} ${y} = ${result}`;
	},

	// =======================================================
	// 計算処理（フォーム送信）
	// =======================================================
	handleSubmit(event) {
		event.preventDefault();

		const allGroups = this.calculationRowsContainer.querySelectorAll('.calculation-row-group');

		allGroups.forEach(group => {
			const rowId = group.id.split('_')[1];

			const input1 = document.getElementById(`number1_${rowId}`);
			const input2 = document.getElementById(`number2_${rowId}`);
			const resultInput = document.getElementById(`result_${rowId}`);
			const operatorElement = document.getElementById(`operator_${rowId}`);

			const operator = operatorElement ? operatorElement.getAttribute('data-operator') : '+';
			let x = parseFloat(input1.value);
			let y = parseFloat(input2.value);
			let result;

			if (isNaN(x) || isNaN(y)) {
				resultInput.value = 'Error';
				document.getElementById(`process_${rowId}`).innerHTML = 'しきがまちがっているよ！';
				return;
			}

			if (operator === '/') {
				if (y === 0) {
					resultInput.value = 'Div/0';
					document.getElementById(`process_${rowId}`).innerHTML = 'ぜろではわれないよ！';
					return;
				}
				result = Math.round((x / y) * 100) / 100;
			} else {
				switch (operator) {
					case '+':
						result = x + y;
						break;
					case '-':
						result = x - y;
						break;
					case '*':
						result = x * y;
						break;
					default:
						result = x + y;
				}
			}

			switch (operator) {
				case '+':
					this.showAdditionProcess(rowId, x, y);
					break;
				case '-':
					this.showSubtractionProcess(rowId, x, y);
					break;
				case '*':
					this.showMultiplicationProcess(rowId, x, y);
					break;
				case '/':
					if (Number.isInteger(x) && Number.isInteger(y)) {
						this.showDivisionProcess(rowId, x, y);
					} else {
						this.showSimpleProcess(rowId, x, y, operator, result);
					}
					break;
				default:
					this.showSimpleProcess(rowId, x, y, operator, result);
			}

			resultInput.value = result;
		});
	},

	// -------------------------------------------------------------
	// キーパッド位置調整・フォーカス処理
	// -------------------------------------------------------------
	adjustKeypadPosition(targetElement) {
		const rect = targetElement.getBoundingClientRect();
		this.keypad.style.top = (rect.bottom + window.scrollY + 5) + 'px';
		this.keypad.style.left = (rect.left + window.scrollX) + 'px';
	},

	handleFocus(event) {
		event.preventDefault();
		const target = event.currentTarget;
		this.activeRowId = target.id.split('_')[1];
		this.currentInput = target;

		setTimeout(() => {
			this.keypad.classList.remove('keypad-hidden');
			this.adjustKeypadPosition(target);
		}, 50);

		const currentOp = document
			.getElementById(`operator_${this.activeRowId}`)
			.getAttribute('data-operator');

		this.operatorButtons.forEach(btn => {
			btn.classList.remove('selected');
			if (btn.getAttribute('data-operator') === currentOp) {
				btn.classList.add('selected');
			}
		});
	},

	attachInputListeners(container) {
		const inputs = container.querySelectorAll('input[id^="number"]');
		inputs.forEach(input => {
			input.addEventListener('focus', this.handleFocus.bind(this));
		});
	},

	// -------------------------------------------------------------
	// 行追加
	// -------------------------------------------------------------
	cloneAndAppendRow() {
		let rowCount = document.querySelectorAll('.calculation-row-group').length;
		rowCount++;
		const originalGroup = document.getElementById('group_1');
		if (!originalGroup) return;

		const newGroup = originalGroup.cloneNode(true);
		newGroup.id = `group_${rowCount}`;

		newGroup.querySelectorAll('input, span, div').forEach(el => {
			if (!el.id) return;
			const idPrefix = el.id.split('_')[0];
			el.id = `${idPrefix}_${rowCount}`;
			if (el.name) {
				el.name = `${idPrefix}_${rowCount}`;
			}
			if (el.tagName === 'INPUT') {
				el.value = '';
			}
			if (el.tagName === 'SPAN') {
				el.textContent = '+';
				el.setAttribute('data-operator', '+');
			}
			if (el.classList.contains('calculation-process')) {
				el.innerHTML = '';
			}
		});

		this.calculationRowsContainer.appendChild(newGroup);
		this.attachInputListeners(newGroup);
	},

	// -------------------------------------------------------------
	// キーパッドクリック
	// -------------------------------------------------------------
	handleKeypadClick(event) {
		if (event.target.tagName !== 'BUTTON' || !this.currentInput) {
			return;
		}
		const value = event.target.getAttribute('data-value');
		if (value === 'C') {
			this.currentInput.value = '';
		} else {
			this.currentInput.value += value;
		}
	},

	// -------------------------------------------------------------
	// ドキュメント全体クリック (キーパッド閉じ)
	// -------------------------------------------------------------
	handleDocumentClick(event) {
		const isOperatorBtn = event.target.closest('#operators');
		const isInput =
			event.target.tagName === 'INPUT' &&
			(event.target.id.startsWith('number1') || event.target.id.startsWith('number2'));
		const isKeypad = this.keypad.contains(event.target);
		const isAddButton = event.target.id === 'addRowButton';
		const isCalculateButton = event.target.id === 'calculateSubmit';

		if (!isKeypad && !isInput && !isOperatorBtn && !isAddButton && !isCalculateButton) {
			this.keypad.classList.add('keypad-hidden');
			this.currentInput = null;
		}
	},

	// -------------------------------------------------------------
	// 演算子ボタンクリック
	// -------------------------------------------------------------
	handleOperatorClick(button) {
		const selectedOperator = button.getAttribute('data-operator');
		const activeOperatorDisplay = document.getElementById(`operator_${this.activeRowId}`);
		if (activeOperatorDisplay) {
			const displayChar =
				selectedOperator === '*' ? '×' :
					selectedOperator === '/' ? '÷' : selectedOperator;
			activeOperatorDisplay.textContent = displayChar;
			activeOperatorDisplay.setAttribute('data-operator', selectedOperator);
		}
		this.operatorButtons.forEach(btn => btn.classList.remove('selected'));
		button.classList.add('selected');
	},

	// =======================================================
	// 初期化
	// =======================================================
	init() {
		const form = document.getElementById('calculationForm');
		if (form) {
			form.addEventListener('submit', this.handleSubmit.bind(this));
		}

		const initialGroup = document.getElementById('group_1');
		if (initialGroup) {
			const inputs = initialGroup.querySelectorAll('input[id^="number"]');
			inputs.forEach(input => {
				input.addEventListener('focus', this.handleFocus.bind(this));
			});
		}

		if (this.addRowButton) {
			this.addRowButton.addEventListener('click', this.cloneAndAppendRow.bind(this));
		}

		if (this.keypad) {
			this.keypad.addEventListener('click', this.handleKeypadClick.bind(this));
		}

		document.addEventListener('click', this.handleDocumentClick.bind(this));

		this.operatorButtons.forEach(button => {
			button.addEventListener('click', () => {
				this.handleOperatorClick(button);
			});
		});
	}
};

// DOM読み込み後に初期化
document.addEventListener('DOMContentLoaded', () => {
	Calculator.init();
});


