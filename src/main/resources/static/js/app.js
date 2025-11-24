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
	// 💡 修正: maxCols (筆算の最大桁数) を引数に追加
	generateMathHTML(maxCols, operator, strX, strY, finalResult, carriesOrBorrows) {
		let html = '';
		// 💡 修正: Gridスタイルに maxCols を使用
		const gridStyle = `style="--cols: ${maxCols}"`;

		// 1. 繰り上がり/繰り下がりの行
		if (carriesOrBorrows && carriesOrBorrows.some(c => c !== '')) {
			const carryRow = carriesOrBorrows.join('');
			html += `<div class="math-row carry-row" ${gridStyle}>`;
			html += `<div class="operator-cell"></div>`;

			// 💡 修正: パディングに maxCols を使用
			const paddedCarry = carryRow.padStart(maxCols, ' ');
			for (let i = 0; i < maxCols; i++) {
				html += `<div class="digit">${paddedCarry[i] === ' ' ? '' : paddedCarry[i]}</div>`;
			}
			html += `</div>`;
		}

		// 2. 最初の数 (X)
		html += `<div class="math-row" ${gridStyle}>`;
		html += `<div class="operator-cell"></div>`;

		// 💡 修正: パディングに maxCols を使用
		const paddedX = strX.padStart(maxCols, ' ');
		for (let i = 0; i < maxCols; i++) {
			html += `<div class="digit">${paddedX[i]}</div>`;
		}
		html += `</div>`;

		// 3. 2番目の数 (Y) と演算子
		html += `<div class="math-row" ${gridStyle}>`;
		html += `<div class="operator-cell">${operator}</div>`;

		// 💡 修正: パディングに maxCols を使用
		const paddedY = strY.padStart(maxCols, ' ');
		for (let i = 0; i < maxCols; i++) {
			html += `<div class="digit">${paddedY[i]}</div>`;
		}
		html += `</div>`;

		// 線
		html += `<div class="horizontal-line" ${gridStyle}><div class="operator-cell"></div><div class="line-area"></div></div>`;

		// 4. 答えの行
		html += `<div class="math-row answer-row" ${gridStyle}>`;
		html += `<div class="operator-cell"></div>`;

		// 💡 修正: パディングに maxCols を使用
		const paddedResult = finalResult.padStart(maxCols, ' ');
		for (let i = 0; i < maxCols; i++) {
			html += `<div class="digit">${paddedResult[i]}</div>`;
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

		let digitsX = strX.split('').map(Number).reverse();
		let digitsY = strY.split('').map(Number).reverse();
		let resultDigits = [];
		let carries = [];
		let carry = 0;

		const maxLength = Math.max(strX.length, strY.length);

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
			.join('');

		// 💡 修正: maxCols の計算
		// 加算では、X, Y, 結果の最大桁数を maxCols とする
		const maxCols = Math.max(strX.length, strY.length, finalResult.length);

		// 💡 修正: maxCols を generateMathHTML に渡す
		processElement.innerHTML = this.generateMathHTML(maxCols, '+', strX, strY, finalResult, carryLine.split(''));
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

		// 💡 修正: maxCols を X, Y, 結果の長さの最大値に設定する
		const lenX = strX.length;
		const lenY = strY.length;
		const finalResultRaw = x - y;
		const finalResult = String(finalResultRaw);
		const lenR = finalResult.length;

		// 筆算の幅は、X, Y, 結果の長さの最大値とする
		const maxCols = Math.max(lenX, lenY, lenR);

		const maxLength = Math.max(lenX, lenY);

		let digitsX = strX.split('').map(Number);
		let digitsY = strY.split('').map(Number);

		// 桁数を揃える（計算ロジック用）
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
						// 繰り下げマークは、数字の上の桁に表示されるため、位置は一つ左
						borrows[j] = '↓';
						break;
					} else {
						modifiedDigitsX[j] = 9;
					}
				}
			}

			resultDigits.unshift(dX - dY);
		}

		const rawFinalResultStr = resultDigits.join('');

		// finalResult の長さに合わせて adjustedBorrows を調整
		let adjustedBorrows = [];

		// ゼロ詰めの数（digitsX, digitsY）と結果の数（finalResult）の長さの差
		// 例: 100(3桁) - 88(2桁) = 12(2桁)。maxLength=3, lenR=2。diff=1。
		const diff = maxLength - finalResult.length;

		// adjustedBorrows の長さが finalResult の長さになるように調整し、
		// 筆算の右端に合わせて左側にパディングを設ける
		// (generateMathHTML内で、borrows.join('')が最大幅でパディングされる)

		// borrows は maxLength の長さを持つ
		// 例: [ , '↓', '↓']  ->  100 - 78 = 22
		// 結果が '22' (2桁) なので、右端2桁の上の借り入れだけを使用

		// borrows のうち、結果の桁数分だけを右側から抽出
		const borrowSlice = borrows.slice(diff);

		// adjustedBorrows は finalResult と同じ長さになり、各桁の上に対応
		for (let i = 0; i < finalResult.length; i++) {
			adjustedBorrows.push(borrowSlice[i] || '');
		}

		// 💡 修正: maxCols を generateMathHTML に渡す
		processElement.innerHTML = this.generateMathHTML(maxCols, '-', strX, strY, finalResult, adjustedBorrows);
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

		// 💡 修正: maxCols を X, Y, 結果の長さの最大値に設定する
		const maxCols = Math.max(strX.length, strY.length, finalResult.length);
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

		// 5. 最終線 (常に表示する)
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
	// 途中式ロジック (割り算) - 変更なし（前回の提案から安定化されているため）
	// ------------------------------------------------------------------
	showDivisionProcess(rowId, x, y) {
		const processElement = document.getElementById(`process_${rowId}`);
		if (!processElement) return;

		if (y === 0) {
			processElement.innerHTML = '<div>ぜろではわれないよ！</div>';
			return;
		}
		if (x < 0 || y < 0) {
			processElement.innerHTML = '<div>正の数のみ対応しています。</div>';
			return;
		}

		const initialY = y;
		let strX = String(x);
		const decimalPlaces = 2; // 小数点以下2桁まで計算

		let originalDecimalPointIndex = strX.indexOf('.');
		if (originalDecimalPointIndex === -1) {
			originalDecimalPointIndex = strX.length;
		}

		// 割られる数の準備: ドットを取り除き、計算用の0を追加
		let rawDividend = strX.replace('.', '');

		// 小数点以下の計算のために '0' を追加
		rawDividend += '0'.repeat(decimalPlaces);

		let currentRemainder = 0;
		let quotientDigits = [];
		let steps = [];
		let dividendIndex = 0; // rawDividendの現在処理中の桁のインデックス

		let quotientHasStarted = false; // 商のゼロを無視するためのフラグ
		let finalRemainder = 0;
		let isDecimalPhase = false;

		// 計算ループ: 商の各桁を計算
		while (dividendIndex < rawDividend.length) {

			let workingDividend = currentRemainder * 10;

			// 新しく引き下ろす桁をWorking Dividendに追加
			workingDividend += parseInt(rawDividend[dividendIndex], 10);

			let qDigit = Math.floor(workingDividend / initialY);
			let product = qDigit * initialY;
			currentRemainder = workingDividend - product;

			// 商の桁が小数点を超えるかどうかのチェック
			if (dividendIndex === originalDecimalPointIndex) {
				quotientDigits.push('.');
				isDecimalPhase = true;
			}

			// 商の桁の記録と、ゼロのスキップ処理
			if (qDigit > 0 || quotientHasStarted || isDecimalPhase) {
				quotientDigits.push(String(qDigit));
				quotientHasStarted = true;
			} else {
				// 商の先頭の0はスキップし、位置合わせのために' 'をプッシュ
				quotientDigits.push(' ');
			}

			// 有効な計算ステップ（商が0より大きいか、小数点計算中）の場合のみ記録
			if (qDigit > 0 || (quotientHasStarted && product > 0)) {

				// 部分積の開始桁位置を特定
				let productEndIndex = dividendIndex + 1; // rawDividend基準
				let productStr = String(product);

				steps.push({
					productStr: productStr,
					productEndIndex: productEndIndex,
					remainderStr: String(currentRemainder),
					currentDividendEndIndex: dividendIndex + 1
				});
			}

			// 小数点以下2桁目の計算が終わったら終了
			if (isDecimalPhase && dividendIndex >= originalDecimalPointIndex + decimalPlaces - 1) {
				finalRemainder = currentRemainder;
				break;
			}

			// 割り切れたら終了
			if (dividendIndex >= originalDecimalPointIndex && currentRemainder === 0) {
				finalRemainder = 0;
				break;
			}

			dividendIndex++;
		}

		// 最終的な商と余りの表示調整
		let finalQuotientDisplay = quotientDigits.join('');

		// 商の表示用のパディング
		let strQforDisplay = finalQuotientDisplay.replace(/^[ ]+/, ''); // 先頭の空白を削除

		// 筆算の最大幅を決定 (割られる数 + 割り切れない場合の '...' のための余裕)
		const maxTotalCols = rawDividend.length + 1;
		let maxStepsWidth = maxTotalCols * 1.1 + 10;

		// --- 1. 商のHTML生成 ---
		let quotientHTML = '';
		let quotientOffset = 0; // 割られる数に対する商の開始オフセット

		let cleanedDividend = rawDividend;

		// 商のゼロは一つだけ表示する
		let qStart = strQforDisplay.indexOf('.');
		if (qStart === -1) qStart = strQforDisplay.length;

		quotientOffset = originalDecimalPointIndex - qStart;

		// 商の桁を割られる数の桁に正確に合わせるためのパディング
		quotientHTML += '<div style="flex-grow: 1;"></div>';
		for (let i = 0; i < quotientOffset; i++) {
			quotientHTML += `<div class="quotient-digit"></div>`;
		}

		for (const digit of strQforDisplay.split('')) {
			quotientHTML += `<div class="quotient-digit">${digit === '.' ? '.' : digit}</div>`;
		}

		// --- 2. ステップのHTML生成 ---
		let stepsHTML = '';
		let currentDivIndex = 0;

		for (let i = 0; i < steps.length; i++) {
			const step = steps[i];

			// A. 引く数 (Product) の行
			let productEndIndex = step.productEndIndex;
			let productStr = step.productStr;

			// Product の開始位置 (rawDividend基準)
			let productStartCol = productEndIndex - productStr.length;
			let productPadding = ' '.repeat(productStartCol);

			stepsHTML += `<div class="step-row">`;
			stepsHTML += `<div class="step-content" style="width: 100%;">`;
			stepsHTML += `<span class="step-operator">-</span>`;
			stepsHTML += `<span style="flex-grow: 1; text-align: right; padding-right: 0.5em;">${productPadding}${productStr}</span>`;
			stepsHTML += `</div>`;
			stepsHTML += `</div>`;

			// B. 線
			stepsHTML += `<div class="step-row"><div class="step-line"></div></div>`;

			// C. 引き算の結果 (Remainder) + 新しく引き下ろす次の桁
			let remainderStr = step.remainderStr;
			let nextDigit = rawDividend[productEndIndex];

			// 余り(resultStr)が配置される開始桁
			const remainderStartCol = productEndIndex - remainderStr.length;
			let remainderPadding = ' '.repeat(remainderStartCol);

			stepsHTML += `<div class="step-row">`;
			stepsHTML += `<div class="step-content" style="width: 100%;">`;
			stepsHTML += `<span style="flex-grow: 1; text-align: right; padding-right: 0.5em;">${remainderPadding}${remainderStr}${nextDigit !== undefined ? nextDigit : ''}</span>`;
			stepsHTML += `</div>`;
			stepsHTML += `</div>`;
		}

		// --- 3. 割り算全体構造のHTML構築 ---

		// 表示用の割られる数 (小数点付き)
		let dividendForDisplay = x;
		if (rawDividend.length > String(x).replace('.', '').length) {
			// 計算のために0を追加した場合、表示にも小数点と0を追加
			dividendForDisplay = String(x) + '.0'.repeat(decimalPlaces);
			// 余分な小数点と0を削除して、必要な表示に調整
			let tempDiv = String(x).split('.');
			if (tempDiv.length === 1) {
				dividendForDisplay = tempDiv[0] + '.' + '0'.repeat(decimalPlaces);
			} else {
				dividendForDisplay = tempDiv[0] + '.' + (tempDiv[1] + '0'.repeat(decimalPlaces)).slice(0, decimalPlaces);
			}
		}

		// 最終結果の表示（resultInputの値と合わせる）
		const finalResultQ = (x / y).toFixed(decimalPlaces);

		let html = `
		    <div class="division-container">
		        <div class="quotient-row">
		            <div class="quotient-placeholder"></div>
		            <div class="quotient-content">${strQforDisplay}</div>
		        </div>
		
		        <div class="division-main">
		            <div class="division-symbol">${initialY}</div>
		            <div class="division-steps-container">
		                <div class="step-dividend">${dividendForDisplay}</div>
		                
		                ${stepsHTML}
		                
		                <div class="remainder-line">...</div>
		            </div>
		        </div>
		        <div class="division-result-summary">商: ${finalResultQ}</div>
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