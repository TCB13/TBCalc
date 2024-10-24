class Credit {

    static docs = {
        name: "credit",
        category: "Advanced Functions",
        syntax: [
            "credit(principal, interest_rate, remaining_terms)",
            "credit(principal, interest_rate, remaining_terms, extra_payment)",
        ],
        description: "Simulate your credit/mortgage/loan repayment using this function.",
        examples: [
            "credit(150000, 2.5, 50)",
            "credit(150000, 2.5, 50, 35000)"
        ],
        seealso: []
    }

    static paymentCalc(principal, interest, terms) {
        interest = interest / 100 / 12;
        const termPaymentTotal = (principal * interest * Math.pow(1 + interest, terms)) / (Math.pow(1 + interest, terms) - 1);
        const termPaymentInterest = principal * interest;
        return {
            termPaymentTotal,
            termPaymentInterest,
            termPaymentCapital: termPaymentTotal - termPaymentInterest,
            terms,
            total: termPaymentTotal * terms
        };
    }

    static termCalc(newPrincipal, termPaymentTotal, interest) {
        const fInterest = interest / 100 / 12;
        const n = Math.log10((termPaymentTotal / fInterest) / ((termPaymentTotal / fInterest) - newPrincipal)) / Math.log10(1 + fInterest);
        return Credit.paymentCalc(newPrincipal, interest, n);
    }

    static formatNumber(num, fractionDigits = 2) {
        return num.toFixed(fractionDigits).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1 ").trim();
    }

    static simulate(principal, interest, terms, extraPayment) {
        if (principal === undefined || interest === undefined || terms === undefined) {
            throw Error("One or more arguments are missing. Syntax:\n    " + Credit.docs.syntax[0] + "\n    " + Credit.docs.syntax[1]);
        }
        if (extraPayment > principal) {
            throw Error("The extra payment can't be bigger than the principal");
        }

        const indent = "    ";
        let rendered = "\n";
        const baseLoan = Credit.paymentCalc(principal, interest, terms);

        let data = [
            ["> Principal", Credit.formatNumber(principal)],
            ["> Interest Rate", Credit.formatNumber(interest)],
            ["> Remaining Terms", Credit.formatNumber(baseLoan.terms, 0)]
        ];

        if (extraPayment) {
            data.push(["> Extra Payment", Credit.formatNumber(extraPayment)]);
        }

        data.push(...[
            [],
            ["Credit Simulation:"],
            [indent + "Term Interest Payment", Credit.formatNumber(baseLoan.termPaymentInterest)],
            [indent + "Term Capital Payment", Credit.formatNumber(baseLoan.termPaymentCapital)],
            [indent + "Term Total Payment", Credit.formatNumber(baseLoan.termPaymentTotal)],
            [indent + "Total", Credit.formatNumber(baseLoan.total)]
        ]);

        rendered += Credit.renderOutput(data, 28);

        if (extraPayment) {
            const newLoanKeepTerms = Credit.paymentCalc(principal - extraPayment, interest, terms);
            const newLoanKeepMonthly = Credit.termCalc(principal - extraPayment, baseLoan.termPaymentTotal, interest);
            const extraData = [
                ["Extra Payment Simulation"],
                [indent + "Strategy - Term Number:"],
                [indent + indent + "Remaining Terms", Credit.formatNumber(newLoanKeepTerms.terms, 0)],
                [indent + indent + "Term Interest Payment", Credit.formatNumber(newLoanKeepTerms.termPaymentInterest)],
                [indent + indent + "Term Capital Payment", Credit.formatNumber(newLoanKeepTerms.termPaymentCapital)],
                [indent + indent + "Term Total Payment", Credit.formatNumber(newLoanKeepTerms.termPaymentTotal), Credit.formatNumber((newLoanKeepTerms.termPaymentTotal - baseLoan.termPaymentTotal))],
                [indent + indent + "Total", Credit.formatNumber(newLoanKeepTerms.total), Credit.formatNumber((newLoanKeepTerms.total - baseLoan.total))],
                [indent + "Strategy - Term Payment:"],
                [indent + indent + "Remaining Terms", Credit.formatNumber(newLoanKeepMonthly.terms, 0), Credit.formatNumber((newLoanKeepMonthly.terms - baseLoan.terms), 0)],
                [indent + indent + "Term Interest Payment", Credit.formatNumber(newLoanKeepMonthly.termPaymentInterest)],
                [indent + indent + "Term Capital Payment", Credit.formatNumber(newLoanKeepMonthly.termPaymentCapital)],
                [indent + indent + "Term Total Payment", Credit.formatNumber(newLoanKeepMonthly.termPaymentTotal)],
                [indent + indent + "Total", Credit.formatNumber(newLoanKeepMonthly.total), Credit.formatNumber((newLoanKeepMonthly.total - baseLoan.total))],
            ];
            rendered += "\n" + Credit.renderOutput(extraData, 33);
        }
        rendered += "\n";
        return rendered;
    }

    static renderOutput(lines, maxChars = 50) {
        let output = "";
        lines.forEach(function (line) {
            if (line[0] !== undefined) {
                if (line.length === 1 && line[0] === "\\-") {
                    output += "-------------------------------------";
                } else {
                    output += line.length === 1 ? "<strong>" + line[0] + "</strong>" : line[0];
                }
            }
            if (line[1] !== undefined) {
                output += " ".repeat(maxChars - line[0].length) + line[1];
            }
            if (line[2] !== undefined) {
                output += "\t " + line[2];
            }
            output += "\n";
        });
        return output;
    }

}
