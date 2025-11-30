import { Facebook, MessageCircle, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Logo and Social */}
          <div>
            <div className="text-red-600 text-2xl mb-6 font-serif font-bold">Mr. DaeBak</div>
            <div className="flex gap-3 mb-6">
              <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.naver.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white hover:bg-green-600 transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center text-white hover:bg-pink-700 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Links and Info */}
          <div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>미스터 대박(주)</p>
              <p>서울시 동대문구 서울시립대로 163 정보기술관 13층</p>
              <p>Tel: 1234-5678</p>
              <p>대표이사 : 김대박 / 개인정보관리 책임자 : 이대박</p>
              <p>통신판매업신고번호: OO 12345 / 사업자등록번호: 123-45-67890</p>
            </div>

            <div className="mt-4 flex gap-8 text-sm">
              <div>
                <p className="text-gray-500">불편신고</p>
                <p>1577-0000</p>
              </div>
              <div>
                <p className="text-gray-500">온라인민원접수</p>
                <p>1566-0000</p>
              </div>
              <div>
                <p className="text-gray-500">고객센터</p>
                <p>1577-0000</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
          COPYRIGHT © 2025 Mr. DaeBak. ALL RIGHTS RESERVED
        </div>
      </div>
    </footer>
  );
}
